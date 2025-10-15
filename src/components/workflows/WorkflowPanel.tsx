import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, Loader2 } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  mode: string;
  created_at: string;
  workflow_steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: any;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export default function WorkflowPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Record<string, WorkflowRun>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*, workflow_steps(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      setRuns(prev => ({ ...prev, [workflowId]: { ...prev[workflowId], status: 'starting' } as any }));
      
      const { data, error } = await supabase
        .from('workflow_runs')
        .insert({
          workflow_id: workflowId,
          status: 'queued',
          log: { events: [] }
        })
        .select()
        .single();

      if (error) throw error;

      setRuns(prev => ({ ...prev, [workflowId]: data }));
      toast.success('Workflow started successfully');
      
      // Trigger the workflow runner
      await supabase.functions.invoke('workflow-runner', {
        method: 'POST'
      });
      
      // Poll for updates
      pollWorkflowStatus(data.id, workflowId);
    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast.error('Failed to start workflow');
      setRuns(prev => {
        const newRuns = { ...prev };
        delete newRuns[workflowId];
        return newRuns;
      });
    }
  };

  const pollWorkflowStatus = async (runId: string, workflowId: string) => {
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (!error && data) {
        setRuns(prev => ({ ...prev, [workflowId]: data }));
        
        if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'cancelled') {
          toast.success(`Workflow ${data.status}`);
          return;
        }
        
        // Continue polling
        setTimeout(checkStatus, 2000);
      }
    };

    setTimeout(checkStatus, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No workflows found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {workflows.map((workflow) => {
        const run = runs[workflow.id];
        const isRunning = run?.status === 'queued' || run?.status === 'running' || run?.status === 'starting';

        return (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription>
                    {workflow.mode} • {workflow.workflow_steps.length} steps
                  </CardDescription>
                </div>
                <Button
                  onClick={() => runWorkflow(workflow.id)}
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Steps:</div>
                <div className="flex flex-wrap gap-2">
                  {workflow.workflow_steps.map((step) => (
                    <Badge key={step.id} variant="outline">
                      {step.name} ({step.type})
                    </Badge>
                  ))}
                </div>
                {run && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Last run: <Badge variant={
                        run.status === 'succeeded' ? 'default' :
                        run.status === 'failed' ? 'destructive' :
                        'secondary'
                      }>{run.status}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
