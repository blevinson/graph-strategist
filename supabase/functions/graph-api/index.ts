import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathWithPrefix = url.pathname;
    const path = pathWithPrefix.includes('/graph-api/') 
      ? pathWithPrefix.split('/graph-api/')[1] 
      : pathWithPrefix.substring(1);
    const method = req.method;

    console.log(`${method} ${path} (full path: ${pathWithPrefix})`);

    // GET /graph - return all nodes and edges
    if (method === 'GET' && path === 'graph') {
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from('nodes').select('*'),
        supabase.from('edges').select('*')
      ]);

      if (nodesRes.error) throw nodesRes.error;
      if (edgesRes.error) throw edgesRes.error;

      const nodes = nodesRes.data.map((n: any) => ({
        id: n.id,
        label: n.label,
        props: n.props,
        position: { x: n.x || 0, y: n.y || 0 }
      }));

      const edges = edgesRes.data.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type
      }));

      return new Response(JSON.stringify({ nodes, edges }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /nodes - create node
    if (method === 'POST' && path === 'nodes') {
      const body = await req.json();
      const { label, props } = body;

      const { data, error } = await supabase
        .from('nodes')
        .insert({ label, props })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        id: data.id,
        label: data.label,
        props: data.props,
        position: { x: data.x || 0, y: data.y || 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PATCH /nodes/{id} - update node
    if (method === 'PATCH' && path.startsWith('nodes/')) {
      const nodeId = path.split('/')[1];
      const body = await req.json();
      const { props } = body;

      const { data, error } = await supabase
        .from('nodes')
        .update({ props })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        id: data.id,
        label: data.label,
        props: data.props,
        position: { x: data.x || 0, y: data.y || 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /nodes/{id} - delete node
    if (method === 'DELETE' && path.startsWith('nodes/')) {
      const nodeId = path.split('/')[1];

      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;

      return new Response(JSON.stringify({ message: 'Node deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /edges - create edge
    if (method === 'POST' && path === 'edges') {
      const body = await req.json();
      const { source, target, type } = body;

      const { data, error } = await supabase
        .from('edges')
        .insert({ source, target, type })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        id: data.id,
        source: data.source,
        target: data.target,
        type: data.type
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /edges/{id} - delete edge
    if (method === 'DELETE' && path.startsWith('edges/')) {
      const edgeId = path.split('/')[1];

      const { error } = await supabase
        .from('edges')
        .delete()
        .eq('id', edgeId);

      if (error) throw error;

      return new Response(JSON.stringify({ message: 'Edge deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /goals/{goalId}/blockers - list Risks blocking a Goal
    if (method === 'GET' && path.match(/^goals\/.+\/blockers$/)) {
      const goalId = path.split('/')[1];

      const { data, error } = await supabase
        .from('edges')
        .select('source, nodes!edges_source_fkey(*)')
        .eq('target', goalId)
        .eq('type', 'BLOCKS');

      if (error) throw error;

      const blockers = data
        .filter((e: any) => e.nodes?.label === 'risk')
        .map((e: any) => ({
          id: e.nodes.id,
          label: e.nodes.label,
          props: e.nodes.props,
          position: { x: e.nodes.x || 0, y: e.nodes.y || 0 }
        }));

      return new Response(JSON.stringify(blockers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /signals/{signalId}/impacted-goals - list Goals triggered by a Signal
    if (method === 'GET' && path.match(/^signals\/.+\/impacted-goals$/)) {
      const signalId = path.split('/')[1];

      const { data, error } = await supabase
        .from('edges')
        .select('target, nodes!edges_target_fkey(*)')
        .eq('source', signalId)
        .eq('type', 'TRIGGERS');

      if (error) throw error;

      const goals = data
        .filter((e: any) => e.nodes?.label === 'goal')
        .map((e: any) => ({
          id: e.nodes.id,
          label: e.nodes.label,
          props: e.nodes.props,
          position: { x: e.nodes.x || 0, y: e.nodes.y || 0 }
        }));

      return new Response(JSON.stringify(goals), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /search?q= - text search
    if (method === 'GET' && path === 'search') {
      const query = url.searchParams.get('q') || '';

      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .or(`props->>name.ilike.%${query}%,props->>description.ilike.%${query}%`);

      if (error) throw error;

      const nodes = data.map((n: any) => ({
        id: n.id,
        label: n.label,
        props: n.props,
        position: { x: n.x || 0, y: n.y || 0 }
      }));

      return new Response(JSON.stringify(nodes), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in graph-api function:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
