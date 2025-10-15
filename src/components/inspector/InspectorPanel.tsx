import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { nodeTypeConfig } from '@/types/graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Trash2, AlertTriangle, Target, Play, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export default function InspectorPanel() {
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    updateNode,
    deleteNode,
    getGoalBlockers,
    getSignalImpactedGoals,
  } = useGraphStore();

  const [editedProps, setEditedProps] = useState<any>({});
  const [blockers, setBlockers] = useState<any[]>([]);
  const [impactedGoals, setImpactedGoals] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set());

  const node = nodes.find((n) => n.id === selectedNode);

  useEffect(() => {
    if (node) {
      setEditedProps(node.data.props);
      setWorkflows([]); // Clear old workflows first
      fetchNodeWorkflows();
    } else {
      setWorkflows([]);
    }
  }, [node?.id]); // Use node.id to ensure fresh fetch when node changes

  const fetchNodeWorkflows = async () => {
    if (!selectedNode) return;

    const { data, error } = await supabase
      .from('workflows')
      .select('*, workflow_steps(*)')
      .eq('node_id', selectedNode)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorkflows(data);
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      setRunningWorkflows(prev => new Set(prev).add(workflowId));

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

      await supabase.functions.invoke('workflow-runner', {
        method: 'POST'
      });

      toast.success('Workflow started');

      const pollStatus = async () => {
        const { data: run } = await supabase
          .from('workflow_runs')
          .select('status')
          .eq('id', data.id)
          .single();

        if (run && (run.status === 'succeeded' || run.status === 'failed')) {
          setRunningWorkflows(prev => {
            const next = new Set(prev);
            next.delete(workflowId);
            return next;
          });
          toast[run.status === 'succeeded' ? 'success' : 'error'](
            `Workflow ${run.status}`
          );
        } else {
          setTimeout(pollStatus, 1000);
        }
      };
      setTimeout(pollStatus, 1000);

    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast.error('Failed to start workflow');
      setRunningWorkflows(prev => {
        const next = new Set(prev);
        next.delete(workflowId);
        return next;
      });
    }
  };

  if (!node) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Select a node to view details
        </p>
      </div>
    );
  }

  const typeConfig = nodeTypeConfig[node.data.label];
  
  // Fallback for legacy/unknown node types
  const config = typeConfig || {
    emoji: '❓',
    color: 'hsl(var(--muted))',
    label: node.data.label || 'Unknown'
  };
  
  const nodeEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const handleUpdate = async () => {
    try {
      await updateNode(node.id, editedProps);
      toast.success('Node updated successfully');
    } catch (error) {
      toast.error('Failed to update node');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNode(node.id);
      toast.success('Node deleted successfully');
      setSelectedNode(null);
    } catch (error) {
      toast.error('Failed to delete node');
    }
  };

  const loadBlockers = async () => {
    const data = await getGoalBlockers(node.id);
    setBlockers(data);
  };

  const loadImpactedGoals = async () => {
    const data = await getSignalImpactedGoals(node.id);
    setImpactedGoals(data);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <h2 className="text-lg font-semibold">{config.label}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedNode(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
        <div className="space-y-6 pb-32">
        {/* Node Details */}
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={editedProps.name || ''}
              onChange={(e) =>
                setEditedProps({ ...editedProps, name: e.target.value })
              }
              className="bg-background border-border"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Input
              value={editedProps.status || ''}
              onChange={(e) =>
                setEditedProps({ ...editedProps, status: e.target.value })
              }
              className="bg-background border-border"
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Input
              value={editedProps.priority || ''}
              onChange={(e) =>
                setEditedProps({ ...editedProps, priority: e.target.value })
              }
              className="bg-background border-border"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={editedProps.description || ''}
              onChange={(e) =>
                setEditedProps({ ...editedProps, description: e.target.value })
              }
              className="bg-background border-border min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1">
              Update
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Inputs & Outputs */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Inputs</Label>
            <div className="space-y-1">
              {node.data.inputs && Array.isArray(node.data.inputs) && node.data.inputs.length > 0 ? (
                node.data.inputs.map((input, i) => (
                  <Badge key={i} variant="outline" className="mr-1 mb-1">
                    {input}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No inputs defined</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Outputs</Label>
            <div className="space-y-1">
              {node.data.outputs && Array.isArray(node.data.outputs) && node.data.outputs.length > 0 ? (
                node.data.outputs.map((output, i) => (
                  <Badge key={i} variant="secondary" className="mr-1 mb-1">
                    {output}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No outputs defined</p>
              )}
            </div>
          </div>

          {node.data.context && Object.keys(node.data.context).length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Strategic Context</Label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(node.data.context, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Workflows Section */}
        {workflows.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Workflows</h3>
              <Badge variant="secondary">{workflows.length}</Badge>
            </div>
            <div className="space-y-2">
              {workflows.map((workflow) => {
                const isRunning = runningWorkflows.has(workflow.id);
                return (
                  <div
                    key={workflow.id}
                    className="p-3 rounded-lg border bg-muted/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{workflow.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {workflow.mode} • {workflow.workflow_steps?.length || 0} steps
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => runWorkflow(workflow.id)}
                        disabled={isRunning}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            Running
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Run
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected Edges */}
        <div className="pt-4 border-t">
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
            <span className="font-medium">Connections ({nodeEdges.length})</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {nodeEdges.map((edge) => (
              <div
                key={edge.id}
                className="p-3 bg-background border border-border rounded-lg text-sm"
              >
                <div className="font-medium text-primary">{edge.label}</div>
                <div className="text-muted-foreground text-xs mt-1">
                  {edge.source === node.id ? '→' : '←'}{' '}
                  {nodes.find((n) => n.id === (edge.source === node.id ? edge.target : edge.source))?.data.props.name}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
        </div>

        {/* Special Actions */}
        {node.data.label === 'goal' && (
          <div className="pt-4 border-t">
            <Button
              onClick={loadBlockers}
              variant="outline"
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Show Blockers
            </Button>
            {blockers.length > 0 && (
              <div className="mt-2 space-y-2">
                {blockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="p-2 bg-destructive/10 border border-destructive rounded text-sm"
                  >
                    {blocker.props.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {node.data.label === 'signal' && (
          <div className="pt-4 border-t">
            <Button
              onClick={loadImpactedGoals}
              variant="outline"
              className="w-full"
            >
              <Target className="h-4 w-4 mr-2" />
              Show Impacted Goals
            </Button>
            {impactedGoals.length > 0 && (
              <div className="mt-2 space-y-2">
                {impactedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-2 bg-primary/10 border border-primary rounded text-sm"
                  >
                    {goal.props.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raw JSON */}
        <div className="pt-4 border-t">
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
            <span className="font-medium">Raw JSON</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <pre className="p-3 bg-background border border-border rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(node.data, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
        </div>
        </div>
      </div>
    </div>
  );
}
