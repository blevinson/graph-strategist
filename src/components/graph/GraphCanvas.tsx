import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useGraphStore } from '@/store/graphStore';
import EdgeConnectionDialog from './EdgeConnectionDialog';
import { useState } from 'react';
import { RelationType } from '@/types/graph';
import { toast } from 'sonner';

const nodeTypes = {
  custom: CustomNode,
};

export default function GraphCanvas() {
  const { nodes: storeNodes, edges: storeEdges, fetchGraph, createEdge, selectedNode, deleteNode, subscribeToChanges, subscribeToWorkflowExecution, activeEdgeIds } = useGraphStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    fetchGraph();
    const unsubscribeGraph = subscribeToChanges();
    const unsubscribeWorkflow = subscribeToWorkflowExecution();
    return () => {
      unsubscribeGraph();
      unsubscribeWorkflow();
    };
  }, [fetchGraph, subscribeToChanges, subscribeToWorkflowExecution]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        event.preventDefault();
        deleteNode(selectedNode);
        toast.success('Node deleted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, deleteNode]);

  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    // Apply active animation to edges
    const updatedEdges = storeEdges.map(edge => ({
      ...edge,
      animated: activeEdgeIds.includes(edge.id),
      style: {
        ...edge.style,
        strokeDasharray: activeEdgeIds.includes(edge.id) ? '8 4' : undefined,
      },
    }));
    setEdges(updatedEdges);
  }, [storeEdges, activeEdgeIds, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    setPendingConnection(connection);
  }, []);

  const handleEdgeCreate = async (relationType: RelationType) => {
    if (!pendingConnection?.source || !pendingConnection?.target) return;

    try {
      await createEdge(pendingConnection.source, pendingConnection.target, relationType);
      toast.success('Edge created successfully');
      setPendingConnection(null);
    } catch (error) {
      toast.error('Failed to create edge');
    }
  };

  // Update node positions in store when dragging stops
  const onNodeDragStop = useCallback(
    (event: any, node: any) => {
      const updatedNodes = nodes.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      );
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gradient-to-br from-background via-card to-background"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--muted))"
        />
        <Controls className="bg-card border-border" />
        <MiniMap
          nodeColor={(node) => {
            const config = nodeTypeConfig[node.data.label];
            return config?.color || 'hsl(var(--primary))';
          }}
          className="bg-card border-border"
        />
      </ReactFlow>

      {pendingConnection && (
        <EdgeConnectionDialog
          isOpen={!!pendingConnection}
          onClose={() => setPendingConnection(null)}
          onConfirm={handleEdgeCreate}
        />
      )}
    </>
  );
}

// Import at top to avoid issues
import { nodeTypeConfig } from '@/types/graph';
