import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, nodeTypeConfig, NodeType, RelationType } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import HandleClickDialog from './HandleClickDialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CustomNode = memo(({ data, id }: NodeProps<NodeData>) => {
  const config = nodeTypeConfig[data.label];
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode);
  const { createNode, createEdge, nodes } = useGraphStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [handleType, setHandleType] = useState<'source' | 'target'>('source');
  const [workflowCount, setWorkflowCount] = useState(0);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'succeeded' | 'failed'>('idle');

  // Fetch workflows for this node
  useEffect(() => {
    const fetchWorkflows = async () => {
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('id')
        .eq('node_id', id);
      
      if (!error && workflows) {
        setWorkflowCount(workflows.length);
      }
    };

    const fetchLatestRun = async () => {
      const { data: runs, error } = await supabase
        .from('workflow_runs')
        .select('status, workflows!inner(node_id)')
        .eq('workflows.node_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && runs) {
        setWorkflowStatus(runs.status as any);
      }
    };

    fetchWorkflows();
    fetchLatestRun();

    // Subscribe to workflow run changes
    const channel = supabase
      .channel(`workflow-status-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_runs'
        },
        () => {
          fetchLatestRun();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleHandleClick = (e: React.MouseEvent, type: 'source' | 'target') => {
    e.stopPropagation();
    setHandleType(type);
    setIsDialogOpen(true);
  };

  const handleCreateConnectedNode = async (
    nodeType: NodeType,
    nodeName: string,
    relationType: RelationType
  ) => {
    try {
      const currentNode = nodes.find(n => n.id === id);
      const baseX = currentNode?.position?.x || 0;
      const baseY = currentNode?.position?.y || 0;
      const offset = handleType === 'source' ? 300 : -300;

      const newNodeId = await createNode(nodeType, nodeName, {
        x: baseX,
        y: baseY + offset,
      });

      if (handleType === 'source') {
        await createEdge(id, newNodeId, relationType);
      } else {
        await createEdge(newNodeId, id, relationType);
      }

      toast.success('Node and edge created successfully');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create node and edge');
    }
  };

  const getStatusIcon = () => {
    switch (workflowStatus) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case 'succeeded':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => setSelectedNode(id)}
      className={`relative px-4 py-3 rounded-xl border-2 bg-card shadow-lg cursor-pointer transition-all hover:scale-105 hover:shadow-xl min-w-[180px] ${
        useGraphStore.getState().activeNodeId === id ? 'workflow-node-active' : ''
      }`}
      style={{
        borderColor: config.color,
        boxShadow: `0 4px 20px ${config.color}40`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary cursor-pointer hover:scale-150 transition-transform"
        onClick={(e) => handleHandleClick(e, 'target')}
      />
      
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {config.label}
          </span>
        </div>
        {workflowCount > 0 && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="h-5 px-1.5 text-xs flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {workflowCount}
            </Badge>
            {getStatusIcon()}
          </div>
        )}
      </div>
      
      <div className="text-sm font-semibold text-foreground mb-1">
        {data.props.name}
      </div>
      
      {data.props.status && (
        <div className="text-xs text-muted-foreground">
          Status: {data.props.status}
        </div>
      )}
      
      {data.props.priority && (
        <div className="text-xs text-muted-foreground">
          Priority: {data.props.priority}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary cursor-pointer hover:scale-150 transition-transform"
        onClick={(e) => handleHandleClick(e, 'source')}
      />

      <HandleClickDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleCreateConnectedNode}
        handleType={handleType}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
