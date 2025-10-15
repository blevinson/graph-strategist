import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function executeStep(step: any, supabase: any, log: Array<Record<string, any>>) {
  const logEntry: Record<string, any> = { step: step.name, timestamp: new Date().toISOString() };
  
  try {
    switch (step.type) {
      case 'DELAY':
        const ms = step.config.milliseconds || 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
        logEntry.result = `Delayed ${ms}ms`;
        break;

      case 'HTTP_REQUEST':
        const response = await fetch(step.config.url, {
          method: step.config.method || 'GET',
          headers: step.config.headers || {},
          body: step.config.body ? JSON.stringify(step.config.body) : undefined
        });
        const data = await response.json();
        logEntry.result = { status: response.status, data };
        break;

      case 'SET_NODE_PROP':
        const { data: updateData, error: updateError } = await supabase
          .from('nodes')
          .update({ props: step.config.props })
          .eq('id', step.config.nodeId);
        
        if (updateError) throw updateError;
        logEntry.result = 'Node updated';
        break;

      case 'CREATE_EDGE':
        const { data: edgeData, error: edgeError } = await supabase
          .from('edges')
          .insert({
            source: step.config.source,
            target: step.config.target,
            type: step.config.type
          });
        
        if (edgeError) throw edgeError;
        logEntry.result = 'Edge created';
        break;

      case 'DELETE_EDGE':
        const { error: deleteError } = await supabase
          .from('edges')
          .delete()
          .eq('id', step.config.edgeId);
        
        if (deleteError) throw deleteError;
        logEntry.result = 'Edge deleted';
        break;

      case 'SQL_QUERY':
        // Only allow SELECT queries for safety
        if (!step.config.query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries allowed');
        }
        const { data: queryData, error: queryError } = await supabase
          .rpc('execute_readonly_query', { query_text: step.config.query });
        
        if (queryError) throw queryError;
        logEntry.result = queryData;
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
    
    logEntry.status = 'success';
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    log.push(logEntry);
  }
}

async function runWorkflow(workflowId: string, runId: string, supabase: any) {
  const log: Array<Record<string, any>> = [];

  try {
    // Update run status to running
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        log: { events: log }
      })
      .eq('id', runId);

    // Get workflow and steps
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*, workflow_steps(*)')
      .eq('id', workflowId)
      .single();

    if (workflowError) throw workflowError;

    const steps = workflow.workflow_steps;

    if (workflow.mode === 'SEQUENTIAL') {
      // Execute steps sequentially
      for (const step of steps) {
        await executeStep(step, supabase, log);
      }
    } else if (workflow.mode === 'DAG') {
      // Execute DAG topologically
      const completed = new Set();
      const pending = [...steps];

      while (pending.length > 0) {
        const ready = pending.filter(step => 
          step.depends_on.every((dep: string) => completed.has(dep))
        );

        if (ready.length === 0) {
          throw new Error('Circular dependency or invalid DAG');
        }

        // Execute ready steps in parallel
        await Promise.all(
          ready.map(step => executeStep(step, supabase, log))
        );

        ready.forEach(step => {
          completed.add(step.id);
          pending.splice(pending.indexOf(step), 1);
        });
      }
    }

    // Mark as succeeded
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        log: { events: log }
      })
      .eq('id', runId);

  } catch (error) {
    log.push({ 
      error: error instanceof Error ? error.message : String(error), 
      timestamp: new Date().toISOString() 
    });

    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'failed',
        finished_at: new Date().toISOString(),
        log: { events: log }
      })
      .eq('id', runId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // POST /tick - Process queued workflows
    if (req.method === 'POST') {
      const { data: queuedRuns, error } = await supabase
        .from('workflow_runs')
        .select('id, workflow_id')
        .eq('status', 'queued')
        .limit(10);

      if (error) throw error;

      // Process each queued run
      const promises = queuedRuns.map(run => 
        runWorkflow(run.workflow_id, run.id, supabase)
      );

      await Promise.all(promises);

      return new Response(
        JSON.stringify({ processed: queuedRuns.length }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Workflow runner error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
