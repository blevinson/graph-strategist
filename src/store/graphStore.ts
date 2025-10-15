import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeData, NodeType, RelationType } from '@/types/graph';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  selectedNode: string | null;
  searchQuery: string;
  isLoading: boolean;
  
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  fetchGraph: () => Promise<void>;
  createNode: (nodeType: NodeType, name: string, props?: any) => Promise<void>;
  updateNode: (id: string, props: any) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  createEdge: (source: string, target: string, type: RelationType) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  searchNodes: (query: string) => Promise<void>;
  getGoalBlockers: (goalId: string) => Promise<NodeData[]>;
  getSignalImpactedGoals: (signalId: string) => Promise<NodeData[]>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  searchQuery: '',
  isLoading: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchGraph: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get(`${API_BASE}/graph`);
      const { nodes, edges } = response.data;
      
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
      const response = await axios.post(`${API_BASE}/nodes`, {
        label: nodeType,
        props: { name, ...props },
      });
      
      const newNode = response.data;
      const node: Node<NodeData> = {
        id: newNode.id,
        type: 'custom',
        position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
        data: newNode,
      };
      
      set({ nodes: [...get().nodes, node] });
    } catch (error) {
      console.error('Failed to create node:', error);
      throw error;
    }
  },

  updateNode: async (id, props) => {
    try {
      await axios.patch(`${API_BASE}/nodes/${id}`, { props });
      
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

  deleteNode: async (id) => {
    try {
      await axios.delete(`${API_BASE}/nodes/${id}`);
      
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
      const response = await axios.post(`${API_BASE}/edges`, {
        source,
        target,
        type,
      });
      
      const newEdge = response.data;
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
      await axios.delete(`${API_BASE}/edges/${edgeId}`);
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
      const response = await axios.get(`${API_BASE}/search`, {
        params: { q: query },
      });
      
      const nodes = response.data;
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
      const response = await axios.get(`${API_BASE}/goals/${goalId}/blockers`);
      return response.data;
    } catch (error) {
      console.error('Failed to get goal blockers:', error);
      return [];
    }
  },

  getSignalImpactedGoals: async (signalId) => {
    try {
      const response = await axios.get(`${API_BASE}/signals/${signalId}/impacted-goals`);
      return response.data;
    } catch (error) {
      console.error('Failed to get signal impacted goals:', error);
      return [];
    }
  },
}));
