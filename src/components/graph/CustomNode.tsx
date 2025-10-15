import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, nodeTypeConfig, NodeType, RelationType } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import HandleClickDialog from './HandleClickDialog';
import { toast } from 'sonner';

const CustomNode = memo(({ data, id }: NodeProps<NodeData>) => {
  const config = nodeTypeConfig[data.label];
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode);
  const { createNode, createEdge, nodes } = useGraphStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [handleType, setHandleType] = useState<'source' | 'target'>('source');

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
      // Find a position for the new node
      const currentNode = nodes.find(n => n.id === id);
      const baseX = currentNode?.position?.x || 0;
      const baseY = currentNode?.position?.y || 0;
      const offset = handleType === 'source' ? 300 : -300;

      // Create the new node
      const newNodeId = await createNode(nodeType, nodeName, {
        x: baseX,
        y: baseY + offset,
      });

      // Create the edge based on handle type
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

  return (
    <div
      onClick={() => setSelectedNode(id)}
      className="relative px-4 py-3 rounded-xl border-2 bg-card shadow-lg cursor-pointer transition-all hover:scale-105 hover:shadow-xl min-w-[180px]"
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
      
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{config.emoji}</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {config.label}
        </span>
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
