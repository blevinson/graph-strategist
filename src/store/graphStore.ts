import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeData, NodeType, RelationType } from '@/types/graph';
import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/graph-api`;

interface SimulationResult {
  timestamp: string;
  status: string;
  rationale: string;
  deltas?: any;
}

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  selectedNode: string | null;
  searchQuery: string;
  isLoading: boolean;
  activeWorkflowRun: string | null;
  activeNodeId: string | null;
  activeEdgeIds: string[];
  simulationHistory: SimulationResult[];
  simulationStatus: string | null;
  copilotMessage: string | null;
  
  setCopilotMessage: (message: string | null) => void;
  
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveWorkflowRun: (runId: string | null) => void;
  setActiveNodeId: (nodeId: string | null) => void;
  setActiveEdgeIds: (edgeIds: string[]) => void;
  
  fetchGraph: () => Promise<void>;
  createNode: (nodeType: NodeType, name: string, props?: any) => Promise<string>;
  updateNode: (id: string, props: any) => Promise<void>;
  updateNodePosition: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => Promise<void>;
  createEdge: (source: string, target: string, type: RelationType) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  searchNodes: (query: string) => Promise<void>;
  getGoalBlockers: (goalId: string) => Promise<NodeData[]>;
  getSignalImpactedGoals: (signalId: string) => Promise<NodeData[]>;
  runSimulation: () => Promise<void>;
  subscribeToChanges: () => () => void;
  subscribeToWorkflowExecution: () => () => void;
}

const SIMULATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-respond-simulation`;

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  searchQuery: '',
  isLoading: false,
  activeWorkflowRun: null,
  activeNodeId: null,
  activeEdgeIds: [],
  simulationHistory: [],
  simulationStatus: null,
  copilotMessage: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveWorkflowRun: (runId) => set({ activeWorkflowRun: runId }),
  setActiveNodeId: (nodeId) => set({ activeNodeId: nodeId }),
  setActiveEdgeIds: (edgeIds) => set({ activeEdgeIds: edgeIds }),
  setCopilotMessage: (message) => set({ copilotMessage: message }),

  fetchGraph: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${FUNCTION_URL}/graph`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch graph');
      
      const { nodes, edges } = await response.json();
      
      set({
        nodes: nodes.map((n: NodeData) => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: Math.random() * 500, y: Math.random() * 500 },
          data: n,
        })),
        edges: edges.map((e: EdgeData) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          data: e,
          label: e.type,
          style: { stroke: '#60a5fa', strokeWidth: 2 },
        })),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch graph:', error);
      set({ isLoading: false });
    }
  },

  createNode: async (nodeType, name, props = {}) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ label: nodeType, props: { name, ...props } }),
      });
      
      if (!response.ok) throw new Error('Failed to create node');
      
      const newNode = await response.json();
      const node: Node<NodeData> = {
        id: newNode.id,
        type: 'custom',
        position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
        data: newNode,
      };
      
      set({ nodes: [...get().nodes, node] });
      return newNode.id;
    } catch (error) {
      console.error('Failed to create node:', error);
      throw error;
    }
  },

  updateNode: async (id, props) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/nodes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ props }),
      });
      
      if (!response.ok) throw new Error('Failed to update node');
      
      const nodes = get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, props: { ...node.data.props, ...props } } }
          : node
      );
      
      set({ nodes });
    } catch (error) {
      console.error('Failed to update node:', error);
      throw error;
    }
  },

  updateNodePosition: async (id, x, y) => {
    // Update local state immediately
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, position: { x, y } } : n
      )
    });
    
    // Persist to database
    try {
      const { error } = await supabase
        .from('nodes')
        .update({ x, y })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update node position:', error);
    }
  },

  deleteNode: async (id) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/nodes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete node');
      
      set({
        nodes: get().nodes.filter((node) => node.id !== id),
        edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
        selectedNode: get().selectedNode === id ? null : get().selectedNode,
      });
    } catch (error) {
      console.error('Failed to delete node:', error);
      throw error;
    }
  },

  createEdge: async (source, target, type) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ source, target, type }),
      });
      
      if (!response.ok) throw new Error('Failed to create edge');
      
      const newEdge = await response.json();
      const edge: Edge<EdgeData> = {
        id: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        type: 'smoothstep',
        data: newEdge,
        label: newEdge.type,
        style: { stroke: '#60a5fa', strokeWidth: 2 },
      };
      
      set({ edges: [...get().edges, edge] });
    } catch (error) {
      console.error('Failed to create edge:', error);
      throw error;
    }
  },

  deleteEdge: async (edgeId) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/edges/${edgeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete edge');
      set({ edges: get().edges.filter((edge) => edge.id !== edgeId) });
    } catch (error) {
      console.error('Failed to delete edge:', error);
      throw error;
    }
  },

  searchNodes: async (query) => {
    if (!query.trim()) {
      await get().fetchGraph();
      return;
    }
    
    try {
      const response = await fetch(`${FUNCTION_URL}/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Failed to search nodes');
      
      const nodes = await response.json();
      set({
        nodes: nodes.map((n: NodeData) => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: Math.random() * 500, y: Math.random() * 500 },
          data: n,
        })),
      });
    } catch (error) {
      console.error('Failed to search nodes:', error);
    }
  },

  getGoalBlockers: async (goalId) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/goals/${goalId}/blockers`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to get goal blockers');
      return await response.json();
    } catch (error) {
      console.error('Failed to get goal blockers:', error);
      return [];
    }
  },

  getSignalImpactedGoals: async (signalId) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/signals/${signalId}/impacted-goals`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to get signal impacted goals');
      return await response.json();
    } catch (error) {
      console.error('Failed to get signal impacted goals:', error);
      return [];
    }
  },

  subscribeToChanges: () => {
    let debounceTimer: NodeJS.Timeout;
    
    const nodesChannel = supabase
      .channel('nodes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes'
        },
        () => {
          // Debounce to avoid rapid refetches
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            get().fetchGraph();
          }, 500);
        }
      )
      .subscribe();

    const edgesChannel = supabase
      .channel('edges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edges'
        },
        () => {
          // Debounce to avoid rapid refetches
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            get().fetchGraph();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(nodesChannel);
      supabase.removeChannel(edgesChannel);
    };
  },

  runSimulation: async () => {
    try {
      set({ simulationStatus: 'running' });
      
      const state = get();
      const graphData = {
        nodes: state.nodes.map(n => n.data),
        edges: state.edges.map(e => e.data),
      };

      const response = await fetch(SIMULATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          planId: 'default',
          command: 'SIMULATE_ONCE',
          graph: graphData,
          context: {
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const result = await response.json();
      
      // Add to history
      const simulationResult: SimulationResult = {
        timestamp: new Date().toISOString(),
        status: 'completed',
        rationale: result.trace?.[0]?.content || 'Simulation complete',
        deltas: result.deltas,
      };
      
      set({
        simulationHistory: [simulationResult, ...get().simulationHistory],
        simulationStatus: null,
      });

      // Apply deltas if any
      if (result.deltas?.nodes) {
        await get().fetchGraph();
      }
    } catch (error) {
      console.error('Simulation error:', error);
      set({
        simulationHistory: [
          {
            timestamp: new Date().toISOString(),
            status: 'failed',
            rationale: error instanceof Error ? error.message : 'Unknown error',
          },
          ...get().simulationHistory,
        ],
        simulationStatus: null,
      });
      throw error;
    }
  },

  subscribeToWorkflowExecution: () => {
    const workflowRunsChannel = supabase
      .channel('workflow-execution')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_runs'
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const run = payload.new as any;
            if (run.status === 'running') {
              set({ activeWorkflowRun: run.id });
            } else if (run.status === 'succeeded' || run.status === 'failed') {
              set({ 
                activeWorkflowRun: null, 
                activeNodeId: null, 
                activeEdgeIds: [] 
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_runs'
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const stepRun = payload.new as any;
            
            // Fetch the step config to get node_id
            const { data: step } = await supabase
              .from('workflow_steps')
              .select('config')
              .eq('id', stepRun.step_id)
              .single();
            
            const config = step?.config as { node_id?: string } | null;
            
            if (config?.node_id && stepRun.status === 'running') {
              set({ activeNodeId: config.node_id });
              
              // Find edges connected to this node
              const edges = get().edges;
              const connectedEdges = edges
                .filter(e => e.source === config.node_id || e.target === config.node_id)
                .map(e => e.id);
              set({ activeEdgeIds: connectedEdges });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workflowRunsChannel);
    };
  },
}));
