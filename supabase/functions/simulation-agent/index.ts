import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// Tools available to the simulation agent
const tools = [
  {
    name: 'trigger_signal',
    description: 'Trigger a signal node to activate downstream flows. Use this to simulate events happening in the system.',
    input_schema: {
      type: 'object',
      properties: {
        signal_id: {
          type: 'string',
          description: 'UUID of the signal node to trigger'
        }
      },
      required: ['signal_id']
    }
  },
  {
    name: 'analyze_graph_flow',
    description: 'Analyze the complete flow from a starting node (usually a signal) to understand downstream impacts, dependencies, and affected goals.',
    input_schema: {
      type: 'object',
      properties: {
        start_node_id: {
          type: 'string',
          description: 'UUID of the starting node (typically a signal)'
        }
      },
      required: ['start_node_id']
    }
  },
  {
    name: 'get_critical_paths',
    description: 'Identify critical paths from signals to goals to understand which flows are most important for achieving objectives.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'assess_bottlenecks',
    description: 'Identify potential bottlenecks in the graph - nodes with many dependencies or that block multiple goals.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'make_recommendation',
    description: 'Make a strategic recommendation to improve the graph structure based on analysis. This could suggest new nodes, edges, or modifications.',
    input_schema: {
      type: 'object',
      properties: {
        recommendation_type: {
          type: 'string',
          enum: ['add_node', 'add_edge', 'modify_node', 'add_risk_mitigation', 'optimize_flow'],
          description: 'Type of recommendation'
        },
        description: {
          type: 'string',
          description: 'Detailed description of the recommendation'
        },
        rationale: {
          type: 'string',
          description: 'Why this recommendation matters'
        }
      },
      required: ['recommendation_type', 'description', 'rationale']
    }
  }
];

async function executeTool(toolName: string, args: any, supabase: any) {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case 'trigger_signal': {
      const { signal_id } = args;
      
      // Get signal node
      const { data: signal, error: signalError } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', signal_id)
        .eq('label', 'signal')
        .single();
      
      if (signalError || !signal) {
        return { error: 'Signal not found' };
      }

      // Find triggered edges
      const { data: edges, error: edgesError } = await supabase
        .from('edges')
        .select('target, type')
        .eq('source', signal_id)
        .eq('type', 'triggers');
      
      if (edgesError) return { error: edgesError.message };

      const triggeredNodeIds = edges?.map((e: any) => e.target) || [];
      
      // Update triggered nodes
      for (const nodeId of triggeredNodeIds) {
        const { data: node } = await supabase
          .from('nodes')
          .select('props')
          .eq('id', nodeId)
          .single();
        
        if (node) {
          await supabase
            .from('nodes')
            .update({
              props: {
                ...node.props,
                status: 'active',
                triggered_at: new Date().toISOString(),
                triggered_by: signal_id
              }
            })
            .eq('id', nodeId);
        }
      }

      return {
        success: true,
        signal_name: signal.props.name,
        triggered_count: triggeredNodeIds.length,
        triggered_node_ids: triggeredNodeIds
      };
    }

    case 'analyze_graph_flow': {
      const { start_node_id } = args;
      
      // Get all edges
      const { data: allEdges } = await supabase.from('edges').select('*');
      const { data: allNodes } = await supabase.from('nodes').select('*');
      
      // Build adjacency map
      const adjacency = new Map<string, string[]>();
      allEdges?.forEach((edge: any) => {
        if (!adjacency.has(edge.source)) {
          adjacency.set(edge.source, []);
        }
        adjacency.get(edge.source)!.push(edge.target);
      });

      // BFS to find all reachable nodes
      const visited = new Set<string>();
      const queue = [start_node_id];
      const levels: any = { [start_node_id]: 0 };
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        
        const neighbors = adjacency.get(current) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
            levels[neighbor] = (levels[current] || 0) + 1;
          }
        });
      }

      // Get affected nodes
      const affectedNodes = allNodes?.filter((n: any) => visited.has(n.id)) || [];
      const affectedGoals = affectedNodes.filter((n: any) => n.label === 'goal');
      const affectedTasks = affectedNodes.filter((n: any) => n.label === 'task');
      const affectedDecisions = affectedNodes.filter((n: any) => n.label === 'decision');

      return {
        total_affected: affectedNodes.length,
        affected_goals: affectedGoals.map((n: any) => ({ id: n.id, name: n.props.name })),
        affected_tasks: affectedTasks.map((n: any) => ({ id: n.id, name: n.props.name })),
        affected_decisions: affectedDecisions.map((n: any) => ({ id: n.id, name: n.props.name })),
        flow_depth: Math.max(...Object.values(levels) as number[])
      };
    }

    case 'get_critical_paths': {
      const { data: allNodes } = await supabase.from('nodes').select('*');
      const { data: allEdges } = await supabase.from('edges').select('*');
      
      const signals = allNodes?.filter((n: any) => n.label === 'signal') || [];
      const goals = allNodes?.filter((n: any) => n.label === 'goal') || [];
      
      // Build reverse adjacency (for backtracking from goals)
      const reverseAdj = new Map<string, string[]>();
      allEdges?.forEach((edge: any) => {
        if (!reverseAdj.has(edge.target)) {
          reverseAdj.set(edge.target, []);
        }
        reverseAdj.get(edge.target)!.push(edge.source);
      });

      const criticalPaths: any[] = [];
      
      // For each goal, find signals that lead to it
      goals.forEach((goal: any) => {
        const pathsToGoal: string[][] = [];
        
        const dfs = (nodeId: string, path: string[]) => {
          const node = allNodes?.find((n: any) => n.id === nodeId);
          if (!node) return;
          
          if (node.label === 'signal') {
            pathsToGoal.push([...path, nodeId]);
            return;
          }
          
          const predecessors = reverseAdj.get(nodeId) || [];
          if (predecessors.length === 0) return;
          
          predecessors.forEach(pred => dfs(pred, [...path, nodeId]));
        };
        
        dfs(goal.id, []);
        
        if (pathsToGoal.length > 0) {
          criticalPaths.push({
            goal: { id: goal.id, name: goal.props.name },
            path_count: pathsToGoal.length,
            longest_path_length: Math.max(...pathsToGoal.map(p => p.length))
          });
        }
      });

      return {
        total_goals: goals.length,
        goals_with_signal_paths: criticalPaths.length,
        critical_paths: criticalPaths
      };
    }

    case 'assess_bottlenecks': {
      const { data: allNodes } = await supabase.from('nodes').select('*');
      const { data: allEdges } = await supabase.from('edges').select('*');
      
      // Count incoming and outgoing edges for each node
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();
      
      allEdges?.forEach((edge: any) => {
        outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      });

      const bottlenecks = allNodes
        ?.map((node: any) => ({
          id: node.id,
          name: node.props.name,
          label: node.label,
          in_degree: inDegree.get(node.id) || 0,
          out_degree: outDegree.get(node.id) || 0,
          bottleneck_score: (inDegree.get(node.id) || 0) * (outDegree.get(node.id) || 0)
        }))
        .filter((n: any) => n.bottleneck_score > 0)
        .sort((a: any, b: any) => b.bottleneck_score - a.bottleneck_score)
        .slice(0, 5) || [];

      return {
        top_bottlenecks: bottlenecks,
        analysis: `Identified ${bottlenecks.length} potential bottleneck nodes based on connectivity.`
      };
    }

    case 'make_recommendation': {
      const { recommendation_type, description, rationale } = args;
      
      // Store recommendation in strategic_insights table
      const { data, error } = await supabase
        .from('strategic_insights')
        .insert({
          insight_type: 'recommendation',
          content: description,
          metadata: {
            recommendation_type,
            rationale,
            created_by: 'simulation_agent',
            timestamp: new Date().toISOString()
          },
          confidence: 0.85
        })
        .select()
        .single();
      
      if (error) return { error: error.message };
      
      return {
        success: true,
        recommendation_id: data.id,
        type: recommendation_type,
        description,
        rationale
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario } = await req.json();
    
    if (!scenario) {
      throw new Error('Scenario is required');
    }

    console.log('Simulation scenario:', scenario);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current graph state
    const { data: nodes } = await supabase.from('nodes').select('*');
    const { data: edges } = await supabase.from('edges').select('*');
    
    const graphContext = nodes && nodes.length > 0
      ? `\n\n**CURRENT GRAPH STATE:**\nNodes (${nodes.length}):\n${nodes.map(n => `- ${n.label}: "${n.props.name}" (ID: ${n.id})`).join('\n')}\n\nEdges (${edges?.length || 0}):\n${edges?.map(e => `- ${e.type}: ${e.source} → ${e.target}`).join('\n') || 'None'}`
      : '\n\n**CURRENT GRAPH STATE:** Empty canvas.';

    const systemPrompt = `You are a Strategic Simulation Agent for a graph-based planning system. Your role is to:

${graphContext}

**YOUR MISSION:**
1. Analyze strategic scenarios by triggering signals and observing cascading effects
2. Identify critical paths, bottlenecks, and risk points in business processes
3. Make data-driven recommendations to improve the graph structure
4. Assess business impact of events and changes

**WHEN USER ASKS TO "RUN SIMULATION":**
1. Identify relevant signals to trigger (e.g., "New user signup", "Customer complaint")
2. Use trigger_signal to fire each signal
3. Use analyze_graph_flow to understand downstream impact
4. Use get_critical_paths to understand goal dependencies
5. Use assess_bottlenecks to identify weak points
6. Use make_recommendation to suggest improvements
7. Provide a comprehensive report

**EXAMPLE WORKFLOW:**
User: "Simulate what happens when a new user signs up"
1. Find "New user signup" signal node
2. trigger_signal on that node
3. analyze_graph_flow from that signal
4. Report: "Triggered 3 nodes: decision 'Is premium?', outcomes 'Premium onboarding' and 'Free tier'. This affects goal 'Launch mobile app' because..."
5. make_recommendation if you see opportunities for improvement

**ANALYSIS TIPS:**
- Look for orphaned nodes (no incoming/outgoing edges)
- Identify goals that depend on many fragile paths
- Suggest risk mitigation tasks for critical flows
- Recommend monitoring points (agent nodes) at key junctions

Be analytical, strategic, and actionable. Always explain the business impact of your findings.`;

    const messages = [
      {
        role: 'user',
        content: scenario
      }
    ];

    // Call Claude with tool support
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    console.log('Claude response:', JSON.stringify(data, null, 2));

    let finalText = '';
    const toolResults: any[] = [];

    // Process Claude's response
    for (const content of data.content) {
      if (content.type === 'text') {
        finalText += content.text;
      } else if (content.type === 'tool_use') {
        const toolResult = await executeTool(content.name, content.input, supabase);
        toolResults.push({
          tool: content.name,
          input: content.input,
          result: toolResult
        });
      }
    }

    // If Claude used tools, get final response
    if (toolResults.length > 0 && data.stop_reason === 'tool_use') {
      const toolResultsForClaude = data.content
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any, i: number) => ({
          type: 'tool_result',
          tool_use_id: c.id,
          content: JSON.stringify(toolResults[i].result)
        }));

      const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            ...messages,
            { role: 'assistant', content: data.content },
            { role: 'user', content: toolResultsForClaude }
          ]
        }),
      });

      const followUpData = await followUpResponse.json();
      const textContent = followUpData.content.find((c: any) => c.type === 'text');
      if (textContent) {
        finalText += '\n\n' + textContent.text;
      }
    }

    return new Response(
      JSON.stringify({
        analysis: finalText || 'Simulation complete.',
        tool_results: toolResults,
        actions_taken: toolResults.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Simulation agent error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
