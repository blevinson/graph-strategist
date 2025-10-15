import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulationRequest {
  planId: string;
  command: 'SIMULATE_ONCE';
  graph: {
    nodes: any[];
    edges: any[];
  };
  context?: {
    userId?: string;
    timestamp?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const body: SimulationRequest = await req.json();
    console.log('Simulation request:', body);

    const { planId, graph, context } = body;

    // Build system prompt for Claude
    const systemPrompt = `You are a reasoning agent for a consumer planning app called Graph Strategist.

Your job is to evaluate a graph of interconnected nodes and apply if/then logic to determine next actions and outcomes.

Node types:
- goal (⭐): What the user wants to achieve
- task (⚙️): Steps to reach goals (status: todo/doing/done)
- decision (🔀): Branch points with options and guard conditions
- signal (🔔): Triggers based on time/location/metrics
- outcome (✅): Results or milestones
- risk (⚠️): Potential problems
- agent (🤖): AI helpers with specific tools
- tool (🧰): Connected apps/services

Edge types:
- depends_on: Task depends on another task/goal
- leads_to: Task leads to an outcome
- triggers: Signal triggers a task/agent/decision
- branches_to: Decision branches to tasks/outcomes
- mitigates: Task mitigates a risk
- uses: Task/agent uses a tool

When a signal's condition is met, activate connected nodes.
When a task is marked "done", check if it leads to outcomes.
When a decision guard evaluates true, follow that branch.

Return ONLY a JSON object with this structure:
{
  "deltas": {
    "nodes": [{"id": "nodeId", "props": {"status": "Active"}}],
    "edges": [],
    "log": [{"ts": "2025-01-15T10:30:00Z", "msg": "Signal triggered → Task activated"}]
  },
  "rationale": "Brief natural language explanation of what happened"
}

Never invent new node IDs. Only update existing nodes based on logic.`;

    // Build user prompt with graph context
    const userPrompt = `Current graph state:

Nodes:
${JSON.stringify(graph.nodes, null, 2)}

Edges:
${JSON.stringify(graph.edges, null, 2)}

Context:
${JSON.stringify(context || {}, null, 2)}

Evaluate the graph logic and determine what should happen next. Apply all relevant triggers, conditions, and state transitions.`;

    // Call Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Claude response:', result);

    const assistantMessage = result.content[0].text;
    
    // Parse JSON from Claude's response
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = assistantMessage.match(/```json\n?([\s\S]*?)\n?```/) || 
                        assistantMessage.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : assistantMessage;
      parsedResult = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse Claude response:', assistantMessage);
      parsedResult = {
        deltas: { nodes: [], edges: [], log: [] },
        rationale: assistantMessage,
      };
    }

    // Generate run ID
    const runId = crypto.randomUUID();

    return new Response(
      JSON.stringify({
        runId,
        deltas: parsedResult.deltas || { nodes: [], edges: [], log: [] },
        trace: [
          {
            role: 'assistant',
            content: parsedResult.rationale || 'Simulation complete',
          },
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in agent-respond-simulation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
