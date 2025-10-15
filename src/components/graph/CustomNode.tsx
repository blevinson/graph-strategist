import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, nodeTypeConfig } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

const CustomNode = memo(({ data, id }: NodeProps<NodeData>) => {
  const config = nodeTypeConfig[data.label];
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode);

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
        className="w-3 h-3 !bg-primary"
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
        className="w-3 h-3 !bg-primary"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
