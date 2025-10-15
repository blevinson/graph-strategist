import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, Play, Plus, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  mode: 'SEQUENTIAL' | 'DAG';
  workflow_steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: any;
  depends_on: string[];
  position: number;
}

interface WorkflowRun {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  log: any;
  step_runs?: StepRun[];
}

interface StepRun {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  log: any;
  output: any;
  workflow_steps: { name: string; type: string; config: any };
}

export function WorkflowsDrawer() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  
  // Create workflow form state
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    mode: 'SEQUENTIAL' as 'SEQUENTIAL' | 'DAG',
    steps: [] as any[]
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (!selectedWorkflow || !workflowRun) return;

    const channel = supabase
      .channel('workflow-runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_runs',
          filter: `id=eq.${workflowRun.id}`
        },
        () => {
          fetchWorkflowRun(workflowRun.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedWorkflow, workflowRun?.id]);

  const fetchWorkflows = async () => {
    const { data, error } = await supabase
      .from('workflows')
      .select('*, workflow_steps(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorkflows(data as Workflow[]);
    }
  };

  const fetchWorkflowRun = async (runId: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/workflow-api/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      setWorkflowRun(data);
      if (data.status === 'succeeded' || data.status === 'failed') {
        setIsRunning(false);
      }
    }
  };

  const runWorkflow = async (workflowId: string) => {
    setIsRunning(true);
    setSelectedWorkflow(workflowId);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/workflow-api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start workflow: ${errorText}`);
      }

      const run = await response.json();
      setWorkflowRun(run);
      toast({ title: 'Workflow started', description: `Run ID: ${run.id}` });

      // Poll for completion
      setTimeout(() => fetchWorkflowRun(run.id), 1000);

    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast({ 
        title: 'Failed to start workflow', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setIsRunning(false);
    }
  };

  const createWorkflow = async () => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/workflow-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWorkflow)
      });

      if (!response.ok) throw new Error('Failed to create workflow');

      toast({ title: 'Workflow created successfully' });
      setIsCreateDialogOpen(false);
      setNewWorkflow({ name: '', description: '', mode: 'SEQUENTIAL', steps: [] });
      fetchWorkflows();

    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast({ 
        title: 'Failed to create workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const addStep = () => {
    setNewWorkflow(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          name: `Step ${prev.steps.length + 1}`,
          type: 'DELAY',
          config: { milliseconds: 1000 },
          depends_on: [],
          position: prev.steps.length
        }
      ]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'queued':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      queued: 'secondary',
      running: 'default',
      succeeded: 'outline',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Workflows</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Define a new workflow with sequential or DAG execution
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Workflow"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this workflow do?"
                />
              </div>
              <div>
                <Label htmlFor="mode">Execution Mode</Label>
                <Select
                  value={newWorkflow.mode}
                  onValueChange={(value: 'SEQUENTIAL' | 'DAG') => setNewWorkflow(prev => ({ ...prev, mode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEQUENTIAL">Sequential</SelectItem>
                    <SelectItem value="DAG">DAG (Parallel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Steps</Label>
                  <Button size="sm" variant="outline" onClick={addStep}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Step
                  </Button>
                </div>
                {newWorkflow.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No steps yet. Add a step to get started.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {newWorkflow.steps.map((step, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="text-sm font-medium">{step.name}</div>
                          <div className="text-xs text-muted-foreground">{step.type}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={createWorkflow} className="w-full">Create Workflow</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {workflows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No workflows yet. Create one to get started.</p>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      {workflow.description && (
                        <CardDescription>{workflow.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runWorkflow(workflow.id)}
                      disabled={isRunning && selectedWorkflow === workflow.id}
                    >
                      {isRunning && selectedWorkflow === workflow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{workflow.mode}</Badge>
                      <span className="text-muted-foreground">
                        {workflow.workflow_steps.length} steps
                      </span>
                    </div>

                    <Collapsible
                      open={expandedLogs[workflow.id]}
                      onOpenChange={(open) => setExpandedLogs(prev => ({ ...prev, [workflow.id]: open }))}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedLogs[workflow.id] ? 'rotate-180' : ''}`} />
                        View Steps
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-1">
                        {workflow.workflow_steps
                          .sort((a, b) => a.position - b.position)
                          .map((step) => (
                            <div key={step.id} className="text-xs bg-muted p-2 rounded">
                              <div className="font-medium">{step.name}</div>
                              <div className="text-muted-foreground">{step.type}</div>
                            </div>
                          ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {selectedWorkflow === workflow.id && workflowRun && (
                      <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Latest Run</span>
                          {getStatusBadge(workflowRun.status)}
                        </div>
                        {workflowRun.step_runs && workflowRun.step_runs.length > 0 && (
                          <div className="space-y-1">
                            {workflowRun.step_runs.map((stepRun) => (
                              <div key={stepRun.id} className="flex items-center gap-2 text-xs">
                                {getStatusIcon(stepRun.status)}
                                <span>{stepRun.workflow_steps.name}</span>
                                {getStatusBadge(stepRun.status)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
