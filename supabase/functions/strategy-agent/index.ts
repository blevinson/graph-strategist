import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { query, nodeId, analysisType } = await req.json();

    // Fetch the full graph context
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from('nodes').select('*'),
      supabase.from('edges').select('*')
    ]);

    if (nodesRes.error) throw nodesRes.error;
    if (edgesRes.error) throw edgesRes.error;

    const nodes = nodesRes.data;
    const edges = edgesRes.data;

    // Build context about the graph
    const graphContext = {
      totalNodes: nodes.length,
      nodeTypes: [...new Set(nodes.map(n => n.label))],
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.label,
        name: n.props?.name,
        props: n.props,
        inputs: n.inputs || [],
        outputs: n.outputs || [],
        context: n.context || {}
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type
      })),
      relationships: edges.reduce((acc, e) => {
        const sourceNode = nodes.find(n => n.id === e.source);
        const targetNode = nodes.find(n => n.id === e.target);
        if (sourceNode && targetNode) {
          acc.push({
            from: sourceNode.props?.name || sourceNode.label,
            to: targetNode.props?.name || targetNode.label,
            relationship: e.type
          });
        }
        return acc;
      }, [] as any[])
    };

    // If analyzing a specific node, add focus context
    let focusContext = '';
    if (nodeId) {
      const focusNode = nodes.find(n => n.id === nodeId);
      if (focusNode) {
        const incoming = edges.filter(e => e.target === nodeId);
        const outgoing = edges.filter(e => e.source === nodeId);
        
        focusContext = `

FOCUS NODE ANALYSIS:
Node: ${focusNode.props?.name || focusNode.label}
Type: ${focusNode.label}
Properties: ${JSON.stringify(focusNode.props, null, 2)}
Inputs: ${JSON.stringify(focusNode.inputs || [], null, 2)}
Outputs: ${JSON.stringify(focusNode.outputs || [], null, 2)}
Context: ${JSON.stringify(focusNode.context || {}, null, 2)}

Incoming Dependencies (${incoming.length}):
${incoming.map(e => {
  const source = nodes.find(n => n.id === e.source);
  return `  - ${source?.props?.name || source?.label} (${e.type})`;
}).join('\n')}

Outgoing Dependencies (${outgoing.length}):
${outgoing.map(e => {
  const target = nodes.find(n => n.id === e.target);
  return `  - ${target?.props?.name || target?.label} (${e.type})`;
}).join('\n')}
`;
      }
    }

    const systemPrompt = `You are a strategic planning AI agent analyzing a workflow automation system.

The system consists of nodes and edges representing:
- Goals: Strategic objectives to achieve
- Tasks: Actions to complete
- Agents: AI or human agents performing work
- Decisions: Choice points requiring analysis
- Capabilities: Skills or resources available
- Risks: Potential threats or blockers
- Signals: Events or triggers

Your role is to:
1. Analyze the graph structure and relationships
2. Identify strategic patterns, dependencies, and bottlenecks
3. Provide actionable insights and recommendations
4. Suggest optimal strategies and decision paths
5. Highlight risks, opportunities, and critical paths

GRAPH CONTEXT:
${JSON.stringify(graphContext, null, 2)}
${focusContext}

Provide clear, actionable insights in your analysis. Focus on strategic value and practical recommendations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query || 'Analyze the current strategic state and provide key insights and recommendations.' }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI Gateway error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insight = data.choices[0].message.content;

    // Store the insight if it's for a specific node
    if (nodeId && analysisType) {
      await supabase.from('strategic_insights').insert({
        node_id: nodeId,
        insight_type: analysisType,
        content: insight,
        confidence: 0.85,
        metadata: { query, timestamp: new Date().toISOString() }
      });
    }

    return new Response(JSON.stringify({ insight, graphContext }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Strategy agent error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
