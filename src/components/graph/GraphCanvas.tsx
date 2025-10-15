import { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useGraphStore } from '@/store/graphStore';
import EdgeConnectionDialog from './EdgeConnectionDialog';
import { useState } from 'react';
import { RelationType } from '@/types/graph';
import { toast } from 'sonner';
import { nodeTypeConfig } from '@/types/graph';

const nodeTypes = {
  custom: CustomNode,
};

export default function GraphCanvas() {
  const { nodes: storeNodes, edges: storeEdges, fetchGraph, createEdge, selectedNode, deleteNode, subscribeToChanges, subscribeToWorkflowExecution, activeEdgeIds, updateNodePosition } = useGraphStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  // Save viewport whenever it changes
  const onMove = useCallback(() => {
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      viewportRef.current = viewport;
      localStorage.setItem('graph-viewport', JSON.stringify(viewport));
    }
  }, [reactFlowInstance]);

  // Restore viewport on init
  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    const savedViewport = localStorage.getItem('graph-viewport');
    if (savedViewport && isInitialized) {
      try {
        const viewport = JSON.parse(savedViewport);
        instance.setViewport(viewport);
      } catch (e) {
        console.error('Failed to restore viewport:', e);
      }
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchGraph().then(() => setIsInitialized(true));
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
      updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition]
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
        onInit={onInit}
        onMove={onMove}
        nodeTypes={nodeTypes}
        fitView={!isInitialized}
        fitViewOptions={{ padding: 0.2 }}
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
