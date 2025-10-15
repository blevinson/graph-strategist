import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function executeStep(step: any, stepRunId: string, supabase: any) {
  const log: Record<string, any> = { 
    step: step.name, 
    type: step.type,
    started: new Date().toISOString() 
  };
  
  try {
    // Update step run to running
    await supabase
      .from('step_runs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', stepRunId);

    let output: any = null;

    switch (step.type) {
      case 'DELAY':
        const ms = step.config.milliseconds || 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
        output = { delayed_ms: ms };
        log.result = `Delayed ${ms}ms`;
        break;

      case 'HTTP_REQUEST':
        const response = await fetch(step.config.url, {
          method: step.config.method || 'GET',
          headers: step.config.headers || {},
          body: step.config.body ? JSON.stringify(step.config.body) : undefined
        });
        const data = await response.json();
        output = { status: response.status, data };
        log.result = output;
        break;

      case 'SET_NODE_PROP':
        const nodeId = step.config.node_id;
        const propName = step.config.prop_name;
        const propValue = step.config.prop_value;
        
        // Get current node props
        const { data: nodeData } = await supabase
          .from('nodes')
          .select('props')
          .eq('id', nodeId)
          .single();
        
        if (!nodeData) throw new Error(`Node ${nodeId} not found`);
        
        const updatedProps = { ...nodeData.props, [propName]: propValue };
        
        const { error: updateError } = await supabase
          .from('nodes')
          .update({ props: updatedProps })
          .eq('id', nodeId);
        
        if (updateError) throw updateError;
        output = { node_id: nodeId, prop_name: propName, prop_value: propValue };
        log.result = 'Node property updated';
        break;

      case 'CREATE_EDGE':
        const { data: edgeData, error: edgeError } = await supabase
          .from('edges')
          .insert({
            source: step.config.source,
            target: step.config.target,
            type: step.config.type
          })
          .select()
          .single();
        
        if (edgeError) throw edgeError;
        output = edgeData;
        log.result = 'Edge created';
        break;

      case 'DELETE_EDGE':
        const { error: deleteError } = await supabase
          .from('edges')
          .delete()
          .eq('id', step.config.edge_id);
        
        if (deleteError) throw deleteError;
        output = { deleted: step.config.edge_id };
        log.result = 'Edge deleted';
        break;

      case 'EMIT_SIGNAL':
        output = {
          signal: step.config.signal_name,
          payload: step.config.payload || {}
        };
        log.result = `Signal ${step.config.signal_name} emitted`;
        break;

      case 'SQL_QUERY':
        // Only allow SELECT queries for safety
        if (!step.config.query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries allowed');
        }
        const { data: queryData, error: queryError } = await supabase
          .rpc('execute_readonly_query', { query_text: step.config.query });
        
        if (queryError) throw queryError;
        output = queryData;
        log.result = `Query returned ${queryData?.length || 0} rows`;
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
    
    log.status = 'success';
    log.finished = new Date().toISOString();

    // Update step run to succeeded
    await supabase
      .from('step_runs')
      .update({ 
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        log,
        output
      })
      .eq('id', stepRunId);

  } catch (error) {
    log.status = 'failed';
    log.error = error instanceof Error ? error.message : String(error);
    log.finished = new Date().toISOString();

    // Update step run to failed
    await supabase
      .from('step_runs')
      .update({ 
        status: 'failed',
        finished_at: new Date().toISOString(),
        log
      })
      .eq('id', stepRunId);

    throw error;
  }
}

async function runWorkflow(workflowId: string, runId: string, supabase: any) {
  const runLog: Array<Record<string, any>> = [];

  try {
    // Update run status to running
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString()
      })
      .eq('id', runId);

    runLog.push({ event: 'workflow_started', timestamp: new Date().toISOString() });

    // Get workflow and steps
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*, workflow_steps(*)')
      .eq('id', workflowId)
      .single();

    if (workflowError) throw workflowError;

    const steps = workflow.workflow_steps.sort((a: any, b: any) => 
      (a.position || 0) - (b.position || 0)
    );

    // Create step_runs for all steps
    const stepRunsData = steps.map((step: any) => ({
      workflow_run_id: runId,
      step_id: step.id,
      status: 'queued'
    }));

    const { data: stepRuns, error: stepRunsError } = await supabase
      .from('step_runs')
      .insert(stepRunsData)
      .select();

    if (stepRunsError) throw stepRunsError;

    // Create map of step_id to step_run_id
    const stepRunMap = new Map<string, string>(
      stepRuns.map((sr: any) => [sr.step_id, sr.id])
    );

    if (workflow.mode === 'SEQUENTIAL') {
      // Execute steps sequentially
      for (const step of steps) {
        const stepRunId = stepRunMap.get(step.id);
        if (!stepRunId) throw new Error(`Step run not found for step ${step.id}`);
        runLog.push({ event: 'step_started', step: step.name, timestamp: new Date().toISOString() });
        await executeStep(step, stepRunId, supabase);
        runLog.push({ event: 'step_completed', step: step.name, timestamp: new Date().toISOString() });
      }
    } else if (workflow.mode === 'DAG') {
      // Execute DAG topologically
      const completed = new Set();
      const pending = [...steps];

      while (pending.length > 0) {
        const ready = pending.filter((step: any) => 
          (step.depends_on || []).every((dep: string) => completed.has(dep))
        );

        if (ready.length === 0) {
          throw new Error('Circular dependency or invalid DAG');
        }

        // Execute ready steps in parallel
        runLog.push({ 
          event: 'parallel_execution', 
          steps: ready.map((s: any) => s.name),
          timestamp: new Date().toISOString() 
        });

        await Promise.all(
          ready.map((step: any) => {
            const stepRunId = stepRunMap.get(step.id);
            if (!stepRunId) throw new Error(`Step run not found for step ${step.id}`);
            return executeStep(step, stepRunId, supabase);
          })
        );

        ready.forEach((step: any) => {
          completed.add(step.id);
          pending.splice(pending.indexOf(step), 1);
        });
      }
    }

    runLog.push({ event: 'workflow_completed', timestamp: new Date().toISOString() });

    // Mark as succeeded
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        log: { events: runLog }
      })
      .eq('id', runId);

  } catch (error) {
    runLog.push({ 
      event: 'workflow_failed',
      error: error instanceof Error ? error.message : String(error), 
      timestamp: new Date().toISOString() 
    });

    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'failed',
        finished_at: new Date().toISOString(),
        log: { events: runLog }
      })
      .eq('id', runId);
  }
}

Deno.serve(async (req) => {
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

      console.log(`Processing ${queuedRuns.length} queued workflow runs`);

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
