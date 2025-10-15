export type NodeType = 
  | 'goal' 
  | 'task' 
  | 'agent' 
  | 'decision' 
  | 'capability' 
  | 'risk' 
  | 'signal';

export type RelationType =
  | 'DEPENDS_ON'
  | 'ALIGNS_WITH'
  | 'BLOCKS'
  | 'ASSIGNED_TO'
  | 'TRIGGERS'
  | 'PRODUCES'
  | 'MITIGATES';

export interface NodeData {
  id: string;
  label: NodeType;
  props: {
    name: string;
    status?: string;
    priority?: string;
    description?: string;
    [key: string]: any;
  };
  position?: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
  context?: Record<string, any>;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: RelationType;
}

export const nodeTypeConfig = {
  goal: { emoji: '⭐', color: 'hsl(var(--node-goal))', label: 'Goal' },
  task: { emoji: '⚙️', color: 'hsl(var(--node-task))', label: 'Task' },
  agent: { emoji: '🤖', color: 'hsl(var(--node-agent))', label: 'Agent' },
  decision: { emoji: '📄', color: 'hsl(var(--node-decision))', label: 'Decision' },
  capability: { emoji: '⚡', color: 'hsl(var(--node-capability))', label: 'Capability' },
  risk: { emoji: '⚠️', color: 'hsl(var(--node-risk))', label: 'Risk' },
  signal: { emoji: '🔔', color: 'hsl(var(--node-signal))', label: 'Signal' },
};

export const relationTypeConfig: Record<RelationType, { label: string; color: string }> = {
  DEPENDS_ON: { label: 'Depends On', color: '#60a5fa' },
  ALIGNS_WITH: { label: 'Aligns With', color: '#34d399' },
  BLOCKS: { label: 'Blocks', color: '#f87171' },
  ASSIGNED_TO: { label: 'Assigned To', color: '#a78bfa' },
  TRIGGERS: { label: 'Triggers', color: '#fbbf24' },
  PRODUCES: { label: 'Produces', color: '#2dd4bf' },
  MITIGATES: { label: 'Mitigates', color: '#fb923c' },
};
