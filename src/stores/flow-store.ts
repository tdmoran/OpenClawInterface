import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNode: (id: string, update: Partial<Node>) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNode: (id, update) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...update } : node
      ),
    })),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
