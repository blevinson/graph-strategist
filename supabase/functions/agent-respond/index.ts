import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tool definitions
const tools = [
  {
    type: "function",
    function: {
      name: "query_graph",
      description: "Returns all nodes and edges in the graph",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_node",
      description: "Create a new node with a label and properties. Use consumer-friendly node types: goal (⭐ what user wants), task (⚙️ steps to reach goals), decision (🔀 branch points), signal (🔔 triggers), outcome (✅ results), risk (⚠️ problems), agent (🤖 AI helpers), tool (🧰 apps/services)",
      parameters: {
        type: "object",
        properties: {
          label: { 
            type: "string", 
            enum: ["goal", "task", "decision", "signal", "outcome", "risk", "agent", "tool"],
            description: "Node type - use lowercase: goal, task, decision, signal, outcome, risk, agent, tool" 
          },
          name: { type: "string", description: "Node name" },
          description: { type: "string", description: "Node description" },
          props: { type: "object", description: "Additional properties as JSON" }
        },
        required: ["label", "name"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "patch_node",
      description: "Update properties of an existing node",
      parameters: {
        type: "object",
        properties: {
          node_id: { type: "string", description: "UUID of the node to update" },
          props: { type: "object", description: "Properties to update" }
        },
        required: ["node_id", "props"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description: "Delete a node and its related edges",
      parameters: {
        type: "object",
        properties: {
          node_id: { type: "string", description: "UUID of the node to delete" }
        },
        required: ["node_id"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_edge",
      description: "Connect two nodes with a relationship",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "UUID of source node" },
          target: { type: "string", description: "UUID of target node" },
          type: { 
            type: "string",
            enum: ["depends_on", "leads_to", "triggers", "branches_to", "mitigates", "uses"],
            description: "Relationship type - use lowercase: depends_on (task depends on task/goal), leads_to (task leads to outcome), triggers (signal triggers task/agent/decision), branches_to (decision branches to task/outcome), mitigates (task mitigates risk), uses (task/agent uses tool)" 
          }
        },
        required: ["source", "target", "type"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_edge",
      description: "Delete an edge between two nodes",
      parameters: {
        type: "object",
        properties: {
          edge_id: { type: "string", description: "UUID of the edge to delete" }
        },
        required: ["edge_id"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_blockers_for_goal",
      description: "Get all risks blocking a specific goal",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "UUID of the goal" }
        },
        required: ["goal_id"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "impacted_goals_from_signal",
      description: "Get all goals impacted by a specific signal",
      parameters: {
        type: "object",
        properties: {
          signal_id: { type: "string", description: "UUID of the signal" }
        },
        required: ["signal_id"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_workflow",
      description: "Create a new workflow with steps",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Workflow name" },
          mode: { type: "string", enum: ["SEQUENTIAL", "DAG"], description: "Execution mode (SEQUENTIAL or DAG)" },
          steps: {
            type: "array",
            description: "Array of workflow steps",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Step name" },
                type: { 
                  type: "string", 
                  enum: ["DELAY", "HTTP_REQUEST", "SET_NODE_PROP", "CREATE_EDGE", "DELETE_EDGE", "SQL_QUERY"],
                  description: "Step type"
                },
                config: { type: "object", description: "Step configuration" },
                depends_on: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "IDs of steps this step depends on (for DAG mode)"
                }
              },
              required: ["name", "type", "config"]
            }
          }
        },
        required: ["name", "mode", "steps"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_workflow",
      description: "Execute a workflow by name or ID",
      parameters: {
        type: "object",
        properties: {
          workflow_name_or_id: { type: "string", description: "Workflow name or UUID" }
        },
        required: ["workflow_name_or_id"],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_workflows",
      description: "List all available workflows",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_workflow_run_status",
      description: "Get the status of a workflow run",
      parameters: {
        type: "object",
        properties: {
          run_id: { type: "string", description: "Workflow run UUID" }
        },
        required: ["run_id"],
      }
    }
  }
];

// Tool execution functions
async function executeTool(toolName: string, args: any) {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case "query_graph": {
      const { data: nodes } = await supabase.from('nodes').select('*');
      const { data: edges } = await supabase.from('edges').select('*');
      return { nodes: nodes || [], edges: edges || [] };
    }
    
    case "create_node": {
      const { label, name, description, props = {} } = args;
      const nodeProps = { name, description, ...props };
      const { data, error } = await supabase.from('nodes').insert({
        label,
        props: nodeProps,
        x: Math.random() * 500,
        y: Math.random() * 500
      }).select().single();
      if (error) throw error;
      return data;
    }
    
    case "patch_node": {
      const { node_id, props } = args;
      const { data: existing } = await supabase.from('nodes').select('props').eq('id', node_id).single();
      if (!existing) throw new Error("Node not found");
      
      const updatedProps = { ...existing.props, ...props };
      const { data, error } = await supabase.from('nodes')
        .update({ props: updatedProps })
        .eq('id', node_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    
    case "delete_node": {
      const { node_id } = args;
      await supabase.from('edges').delete().or(`source.eq.${node_id},target.eq.${node_id}`);
      const { error } = await supabase.from('nodes').delete().eq('id', node_id);
      if (error) throw error;
      return { success: true, deleted_node_id: node_id };
    }
    
    case "create_edge": {
      const { source, target, type } = args;
      const { data, error } = await supabase.from('edges').insert({
        source,
        target,
        type
      }).select().single();
      if (error) throw error;
      return data;
    }
    
    case "delete_edge": {
      const { edge_id } = args;
      const { error } = await supabase.from('edges').delete().eq('id', edge_id);
      if (error) throw error;
      return { success: true, deleted_edge_id: edge_id };
    }
    
    case "get_blockers_for_goal": {
      const { goal_id } = args;
      const { data: edges } = await supabase.from('edges')
        .select('source')
        .eq('target', goal_id)
        .eq('type', 'BLOCKS');
      
      if (!edges || edges.length === 0) return [];
      
      const riskIds = edges.map(e => e.source);
      const { data: risks } = await supabase.from('nodes')
        .select('*')
        .in('id', riskIds)
        .eq('label', 'Risk');
      
      return risks || [];
    }
    
    case "impacted_goals_from_signal": {
      const { signal_id } = args;
      const { data: edges } = await supabase.from('edges')
        .select('target')
        .eq('source', signal_id)
        .eq('type', 'TRIGGERS');
      
      if (!edges || edges.length === 0) return [];
      
      const goalIds = edges.map(e => e.target);
      const { data: goals } = await supabase.from('nodes')
        .select('*')
        .in('id', goalIds)
        .eq('label', 'Goal');
      
      return goals || [];
    }
    
    case "create_workflow": {
      const { name, mode, steps } = args;
      
      // Create workflow
      const { data: workflow, error: wfError } = await supabase
        .from('workflows')
        .insert({ name, mode })
        .select()
        .single();

      if (wfError) throw wfError;

      // Create steps
      const stepsData = steps.map((step: any) => ({
        workflow_id: workflow.id,
        name: step.name,
        type: step.type,
        config: step.config || {},
        depends_on: step.depends_on || []
      }));

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepsData);

      if (stepsError) throw stepsError;

      return { 
        success: true, 
        workflow_id: workflow.id, 
        name: workflow.name,
        steps_count: steps.length 
      };
    }

    case "run_workflow": {
      const searchTerm = args.workflow_name_or_id;
      
      // Try to find workflow by name or ID
      const { data: workflows, error: wfError } = await supabase
        .from('workflows')
        .select('id')
        .or(`name.eq.${searchTerm},id.eq.${searchTerm}`)
        .limit(1);

      if (wfError || !workflows || workflows.length === 0) {
        throw new Error(`Workflow not found: ${searchTerm}`);
      }

      const workflowId = workflows[0].id;

      // Create a workflow run
      const { data: run, error: runError } = await supabase
        .from('workflow_runs')
        .insert({ workflow_id: workflowId, status: 'queued', log: { events: [] } })
        .select()
        .single();

      if (runError) throw runError;

      return { 
        success: true, 
        run_id: run.id, 
        status: run.status,
        message: `Workflow queued for execution. Run ID: ${run.id}` 
      };
    }

    case "list_workflows": {
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('id, name, mode, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { workflows };
    }

    case "get_workflow_run_status": {
      const { data: run, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('id', args.run_id)
        .single();

      if (error) throw error;

      return run;
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log("Received prompt:", prompt);

    // Query current graph state to provide context
    const { data: existingNodes } = await supabase.from('nodes').select('*');
    const { data: existingEdges } = await supabase.from('edges').select('*');
    
    const graphContext = existingNodes && existingNodes.length > 0
      ? `\n\n**CURRENT GRAPH STATE:**\nNodes (${existingNodes.length}):\n${existingNodes.map(n => `- ${n.label}: "${n.props.name}" (ID: ${n.id})`).join('\n')}\n\nEdges (${existingEdges?.length || 0}):\n${existingEdges?.map(e => `- ${e.type}: ${e.source} → ${e.target}`).join('\n') || 'None'}`
      : '\n\n**CURRENT GRAPH STATE:** Empty canvas - no nodes or edges yet.';

    const messages = [
      {
        role: "system",
        content: `You are a Graph Strategist co-pilot. You help users build and modify their strategy graph.

${graphContext}

🚨 **CRITICAL RULES:** 🚨
1. NEVER delete nodes when user asks to modify/update/change them - use patch_node!
2. ALWAYS create edges when adding new nodes to connect them to the graph!
3. ONLY use delete_node when user explicitly says "delete" or "remove"

**YOUR TOOLS:**
- patch_node({node_id: "xxx", props: {name: "new name", ...}}) - Updates node, KEEPS ALL EDGES
- delete_node({node_id: "xxx"}) - Deletes node AND all its edges (use sparingly!)
- create_node({label: "task", name: "...", ...}) - Creates new node (returns node with ID)
- create_edge({source: "xxx", target: "yyy", type: "triggers"}) - Connects nodes
- delete_edge({edge_id: "zzz"}) - Removes connection

**WHEN USER SAYS "CHANGE X TO Y":**
1. Find node ID for X from graph above
2. Call: patch_node({node_id: "found-id", props: {name: "Y"}})
✅ Node updated, all edges preserved!

**WHEN USER SAYS "ADD X" OR "CREATE X":**
1. Call: create_node({label: "task", name: "X", ...})
2. **IMPORTANT:** Then create_edge to connect it to related nodes!
Example: If adding "send email" task that depends on "validate user":
   - create_node({label: "task", name: "send email"}) → returns {id: "new-id"}
   - create_edge({source: "new-id", target: "validate-user-id", type: "depends_on"})
✅ New node is connected to the graph!

**Node types:** signal, task, decision, outcome, goal, risk, agent, tool
**Edge types:** triggers, depends_on, leads_to, branches_to, mitigates, uses`
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Call Lovable AI with tool calling
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: { type: "auto" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    const message = aiResponse.choices[0].message;
    const toolCalls = message.tool_calls || [];
    
    // Execute all tool calls
    const toolResults: Array<{
      tool: string;
      args?: any;
      result?: any;
      error?: string;
    }> = [];
    
    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);
        toolResults.push({
          tool: toolCall.function.name,
          args,
          result
        });
      } catch (error) {
        console.error(`Tool execution error for ${toolCall.function.name}:`, error);
        toolResults.push({
          tool: toolCall.function.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // If there were tool calls, make a second request with tools available to create edges
    let outputText = message.content || "";
    
    if (toolCalls.length > 0) {
      // Build context message with node IDs for creating edges
      const nodeIds = toolResults
        .filter(r => r.tool === 'create_node' && r.result?.id)
        .map((r, i) => `Node ${i + 1}: ${r.result.props.name} (ID: ${r.result.id})`)
        .join('\n');

      const followUpMessages = [
        ...messages,
        message,
        ...toolCalls.map((tc: any, i: number) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResults[i].result || toolResults[i].error)
        })),
        {
          role: "user",
          content: `Node IDs created:\n${nodeIds}\n\nNow create edges to connect these nodes using create_edge with the IDs above.`
        }
      ];

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: followUpMessages,
          tools,
          tool_choice: { type: "auto" }
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpMessage = followUpData.choices[0].message;
        const followUpToolCalls = followUpMessage.tool_calls || [];
        
        // Execute second round of tool calls (edges)
        for (const toolCall of followUpToolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await executeTool(toolCall.function.name, args);
            toolResults.push({
              tool: toolCall.function.name,
              args,
              result
            });
          } catch (error) {
            console.error(`Tool execution error for ${toolCall.function.name}:`, error);
            toolResults.push({
              tool: toolCall.function.name,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
        
        outputText = followUpMessage.content || "Created nodes and edges!";
      }
    }

    return new Response(
      JSON.stringify({
        output_text: outputText,
        tool_results: toolResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in agent-respond:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
