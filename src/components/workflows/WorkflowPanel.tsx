import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, Loader2, CheckCircle, XCircle, Clock, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  log: {
    events?: Array<{
      step?: string;
      status?: string;
      result?: any;
      error?: string;
      timestamp?: string;
    }>;
  };
}

export default function WorkflowPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Record<string, WorkflowRun>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

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

      setRuns(prev => ({ ...prev, [workflowId]: data as WorkflowRun }));
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
        setRuns(prev => ({ ...prev, [workflowId]: data as WorkflowRun }));
        
        if (data.status === 'succeeded') {
          toast.success('Workflow completed successfully');
          // Graph will auto-update via real-time subscription
          return;
        } else if (data.status === 'failed') {
          toast.error('Workflow failed');
          return;
        } else if (data.status === 'cancelled') {
          toast.info('Workflow cancelled');
          return;
        }
        
        // Continue polling
        setTimeout(checkStatus, 1000);
      }
    };

    setTimeout(checkStatus, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
      case 'queued':
        return 'secondary';
      default:
        return 'outline';
    }
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
        const isRunning = run?.status === 'queued' || run?.status === 'running';
        const hasLogs = run?.log?.events && run.log.events.length > 0;

        return (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Steps:</div>
                  <div className="flex flex-wrap gap-2">
                    {workflow.workflow_steps.map((step) => (
                      <Badge key={step.id} variant="outline">
                        {step.name} ({step.type})
                      </Badge>
                    ))}
                  </div>
                </div>

                {run && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={getStatusBadgeVariant(run.status)}>
                        {run.status}
                      </Badge>
                      {run.started_at && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Started: {new Date(run.started_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {hasLogs && (
                      <Collapsible
                        open={expandedLogs[workflow.id]}
                        onOpenChange={(open) => 
                          setExpandedLogs(prev => ({ ...prev, [workflow.id]: open }))
                        }
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                          <List className="h-4 w-4" />
                          Execution Log ({run.log.events?.length || 0} events)
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <ScrollArea className="h-[200px] rounded-md border p-3 bg-muted/50">
                            <div className="space-y-2">
                              {run.log.events?.map((event, idx) => (
                                <div 
                                  key={idx} 
                                  className="text-xs space-y-1 p-2 rounded bg-background"
                                >
                                  <div className="flex items-center gap-2">
                                    {event.status === 'success' ? (
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                    ) : event.status === 'failed' ? (
                                      <XCircle className="h-3 w-3 text-destructive" />
                                    ) : null}
                                    <span className="font-medium">{event.step}</span>
                                    {event.timestamp && (
                                      <span className="text-muted-foreground ml-auto">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                  {event.result && (
                                    <div className="text-muted-foreground pl-5">
                                      Result: {typeof event.result === 'string' 
                                        ? event.result 
                                        : JSON.stringify(event.result, null, 2)}
                                    </div>
                                  )}
                                  {event.error && (
                                    <div className="text-destructive pl-5">
                                      Error: {event.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {run.finished_at && (
                      <div className="text-xs text-muted-foreground">
                        Finished: {new Date(run.finished_at).toLocaleTimeString()}
                        {run.started_at && ` (${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s)`}
                      </div>
                    )}
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
