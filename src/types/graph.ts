export type NodeType = 
  | 'goal'      // ⭐ What the user wants
  | 'task'      // ⚙️ Step to reach goal
  | 'decision'  // 🔀 Branch point
  | 'signal'    // 🔔 Trigger/condition
  | 'outcome'   // ✅ Result/milestone
  | 'risk'      // ⚠️ Potential problem
  | 'agent'     // 🤖 AI helper
  | 'tool';     // 🧰 Connected app/service

export type RelationType =
  | 'depends_on'    // Task → Task/Goal
  | 'leads_to'      // Task → Outcome
  | 'triggers'      // Signal → Task/Agent/Decision
  | 'branches_to'   // Decision → Task/Outcome
  | 'mitigates'     // Task → Risk
  | 'uses';         // Task/Agent → Tool

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
  decision: { emoji: '🔀', color: 'hsl(var(--node-decision))', label: 'Decision' },
  signal: { emoji: '🔔', color: 'hsl(var(--node-signal))', label: 'Signal' },
  outcome: { emoji: '✅', color: 'hsl(var(--node-outcome))', label: 'Outcome' },
  risk: { emoji: '⚠️', color: 'hsl(var(--node-risk))', label: 'Risk' },
  agent: { emoji: '🤖', color: 'hsl(var(--node-agent))', label: 'Agent' },
  tool: { emoji: '🧰', color: 'hsl(var(--node-tool))', label: 'Tool' },
};

export const relationTypeConfig: Record<RelationType, { label: string; color: string }> = {
  depends_on: { label: 'Depends On', color: '#60a5fa' },
  leads_to: { label: 'Leads To', color: '#34d399' },
  triggers: { label: 'Triggers', color: '#fbbf24' },
  branches_to: { label: 'Branches To', color: '#a78bfa' },
  mitigates: { label: 'Mitigates', color: '#fb923c' },
  uses: { label: 'Uses', color: '#2dd4bf' },
};
