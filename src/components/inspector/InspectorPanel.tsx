import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { nodeTypeConfig } from '@/types/graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Trash2, AlertTriangle, Target } from 'lucide-react';
import { toast } from 'sonner';
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

  const node = nodes.find((n) => n.id === selectedNode);

  useEffect(() => {
    if (node) {
      setEditedProps(node.data.props);
    }
  }, [node]);

  if (!node) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Select a node to view details
        </p>
      </div>
    );
  }

  const config = nodeTypeConfig[node.data.label];
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
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
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

      <div className="p-4 space-y-6">
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

        {/* Connected Edges */}
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

        {/* Special Actions */}
        {node.data.label === 'goal' && (
          <div>
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
          <div>
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
  );
}
