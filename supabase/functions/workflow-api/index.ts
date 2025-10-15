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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    // Extract path after the function name (handles /functions/v1/workflow-api/... or /workflow-api/...)
    const pathParts = url.pathname.split('/').filter(Boolean);
    const functionIndex = pathParts.findIndex(p => p === 'workflow-api');
    const path = functionIndex >= 0 ? pathParts.slice(functionIndex + 1).join('/') : '';
    const method = req.method;

    console.log(`${method} /${path}`);

    // GET /workflows - List all workflows
    if (method === 'GET' && path === 'workflows') {
      const { data, error } = await supabase
        .from('workflows')
        .select('*, workflow_steps(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /workflows/:id - Get workflow by ID
    if (method === 'GET' && path.match(/^workflows\/[^\/]+$/) && !path.includes('/run')) {
      const workflowId = path.split('/')[1];
      
      const { data, error } = await supabase
        .from('workflows')
        .select('*, workflow_steps(*)')
        .eq('id', workflowId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /workflows - Create workflow
    if (method === 'POST' && path === 'workflows') {
      const body = await req.json();
      const { name, mode, steps } = body;

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({ name, mode })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create steps if provided
      if (steps && Array.isArray(steps)) {
        const stepsData = steps.map(step => ({
          workflow_id: workflow.id,
          name: step.name,
          type: step.type,
          config: step.config || {},
          depends_on: step.depends_on || []
        }));

        const { error: stepsError } = await supabase
          .from('workflow_steps')
          .insert(stepsData);

        if (stepsError) throw stepsError;
      }

      return new Response(JSON.stringify(workflow), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /workflows/:id/run - Trigger workflow
    if (method === 'POST' && path.match(/^workflows\/[^\/]+\/run$/)) {
      const workflowId = path.split('/')[1];
      const body = await req.json().catch(() => ({}));
      const meta = body.meta || {};

      // Create workflow run
      const { data: run, error: runError } = await supabase
        .from('workflow_runs')
        .insert({
          workflow_id: workflowId,
          status: 'queued',
          meta,
          log: { events: [] }
        })
        .select()
        .single();

      if (runError) throw runError;

      // Trigger workflow runner
      await supabase.functions.invoke('workflow-runner', {
        method: 'POST'
      });

      return new Response(JSON.stringify(run), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      });
    }

    // GET /runs/:id - Get workflow run with step runs
    if (method === 'GET' && path.match(/^runs\/[^\/]+$/)) {
      const runId = path.split('/')[1];

      const { data: run, error: runError } = await supabase
        .from('workflow_runs')
        .select('*, workflows(name, description, mode)')
        .eq('id', runId)
        .single();

      if (runError) throw runError;

      const { data: stepRuns, error: stepRunsError } = await supabase
        .from('step_runs')
        .select('*, workflow_steps(name, type, config)')
        .eq('workflow_run_id', runId)
        .order('created_at');

      if (stepRunsError) throw stepRunsError;

      return new Response(JSON.stringify({ ...run, step_runs: stepRuns }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /workflow-runs/:id - Get run status
    if (method === 'GET' && path.match(/^workflow-runs\/[^\/]+$/)) {
      const runId = path.split('/')[1];

      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Workflow API error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
