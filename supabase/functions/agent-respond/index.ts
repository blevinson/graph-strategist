import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tool definitions for Claude API
const tools = [
  {
    name: "query_graph",
    description: "Returns all nodes and edges in the graph",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    }
  },
  {
    name: "create_node",
    description: "Create a new node with a label and properties. Use consumer-friendly node types: goal (⭐ what user wants), task (⚙️ steps to reach goals), decision (🔀 branch points), signal (🔔 triggers), outcome (✅ results), risk (⚠️ problems), agent (🤖 AI helpers), tool (🧰 apps/services)",
    input_schema: {
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
  },
  {
    name: "patch_node",
    description: "Update properties of an existing node",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "UUID of the node to update" },
        props: { type: "object", description: "Properties to update" }
      },
      required: ["node_id", "props"],
    }
  },
  {
    name: "delete_node",
    description: "Delete a node and its related edges",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "UUID of the node to delete" }
      },
      required: ["node_id"],
    }
  },
  {
    name: "create_edge",
    description: "Connect two nodes with a relationship",
    input_schema: {
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
  },
  {
    name: "delete_edge",
    description: "Delete an edge between two nodes",
    input_schema: {
      type: "object",
      properties: {
        edge_id: { type: "string", description: "UUID of the edge to delete" }
      },
      required: ["edge_id"],
    }
  },
  {
    name: "get_blockers_for_goal",
    description: "Get all risks blocking a specific goal",
    input_schema: {
      type: "object",
      properties: {
        goal_id: { type: "string", description: "UUID of the goal" }
      },
      required: ["goal_id"],
    }
  },
  {
    name: "impacted_goals_from_signal",
    description: "Get all goals impacted by a specific signal",
    input_schema: {
      type: "object",
      properties: {
        signal_id: { type: "string", description: "UUID of the signal" }
      },
      required: ["signal_id"],
    }
  },
  {
    name: "create_workflow",
    description: "Create a new workflow with steps",
    input_schema: {
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
  },
  {
    name: "run_workflow",
    description: "Execute a workflow by name or ID",
    input_schema: {
      type: "object",
      properties: {
        workflow_name_or_id: { type: "string", description: "Workflow name or UUID" }
      },
      required: ["workflow_name_or_id"],
    }
  },
  {
    name: "list_workflows",
    description: "List all available workflows",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    }
  },
  {
    name: "get_workflow_run_status",
    description: "Get the status of a workflow run",
    input_schema: {
      type: "object",
      properties: {
        run_id: { type: "string", description: "Workflow run UUID" }
      },
      required: ["run_id"],
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
    const { prompt, messages: conversationHistory } = await req.json();
    
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log("Received prompt:", prompt);
    console.log("Conversation history length:", conversationHistory?.length || 0);

    // Query current graph state to provide context
    const { data: existingNodes } = await supabase.from('nodes').select('*');
    const { data: existingEdges } = await supabase.from('edges').select('*');
    
    const graphContext = existingNodes && existingNodes.length > 0
      ? `\n\n**CURRENT GRAPH STATE:**\nNodes (${existingNodes.length}):\n${existingNodes.map(n => `- ${n.label}: "${n.props.name}" (ID: ${n.id})`).join('\n')}\n\nEdges (${existingEdges?.length || 0}):\n${existingEdges?.map(e => `- ${e.type}: ${e.source} → ${e.target}`).join('\n') || 'None'}`
      : '\n\n**CURRENT GRAPH STATE:** Empty canvas - no nodes or edges yet.';

    const systemMessage = {
      role: "system",
      content: `You are a Graph Strategist co-pilot. You help users build and modify their strategy graph.

${graphContext}

🚨 **CRITICAL RULES:** 🚨
1. For updates: use patch_node (NEVER delete+recreate!)
2. **ALWAYS CREATE EDGES after creating nodes** - disconnected nodes are useless!
3. Only delete_node when user explicitly says "delete"

**IMPORTANT: When creating nodes, you MUST also create edges!**

**WORKFLOW FOR "CREATE X THAT TRIGGERS Y":**
Step 1: create_node for X → save returned ID as x_id
Step 2: create_node for Y → save returned ID as y_id  
Step 3: create_edge({source: x_id, target: y_id, type: "triggers"})
✅ Nodes are now connected!

**EXAMPLE: User says "create signal 'user signup' that triggers task 'send email'"**
1. create_node({label: "signal", name: "user signup"}) → returns {id: "abc123"}
2. create_node({label: "task", name: "send email"}) → returns {id: "def456"}
3. **MUST DO:** create_edge({source: "abc123", target: "def456", type: "triggers"})

**EXAMPLE: User says "create decision 'paid?' branching to 'premium' or 'basic'"**
1. create_node({label: "decision", name: "paid?"}) → returns {id: "dec1"}
2. create_node({label: "outcome", name: "premium"}) → returns {id: "out1"}
3. create_node({label: "outcome", name: "basic"}) → returns {id: "out2"}
4. **MUST DO:** create_edge({source: "dec1", target: "out1", type: "branches_to"})
5. **MUST DO:** create_edge({source: "dec1", target: "out2", type: "branches_to"})

**Edge types:** triggers (signal→task/agent/decision), depends_on (task→task/goal), leads_to (task→outcome), branches_to (decision→task/outcome), mitigates (task→risk), uses (task/agent→tool)`
    };

    // Build messages array with conversation history
    const userMessages = conversationHistory && conversationHistory.length > 0
      ? conversationHistory.filter((m: any) => m.role === 'user' || m.role === 'assistant')
      : [{ role: "user", content: prompt }];

    // Call Claude with tool calling
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: userMessages,
        system: systemMessage.content,
        tools
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("Claude Response:", JSON.stringify(aiResponse, null, 2));

    // Parse Claude response
    let messageText = '';
    const toolCalls = [];
    for (const content of aiResponse.content) {
      if (content.type === 'text') {
        messageText += content.text;
      } else if (content.type === 'tool_use') {
        toolCalls.push({
          id: content.id,
          function: {
            name: content.name,
            arguments: JSON.stringify(content.input)
          }
        });
      }
    }
    
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

    // Handle multi-step operations: delete+create, or create+edges
    let outputText = messageText;
    
    if (toolCalls.length > 0) {
      const createdNodes = toolResults.filter(r => r.tool === 'create_node' && r.result?.id);
      const hasDeletes = toolResults.some(r => r.tool === 'delete_node');
      const hasCreates = createdNodes.length > 0;
      
      // Case 1: Created nodes - need to create edges
      if (hasCreates) {
        const nodeIds = createdNodes
          .map((r, i) => `Node ${i + 1}: ${r.result.props.name} (ID: ${r.result.id})`)
          .join('\n');

        const edgeSystemPrompt = systemMessage.content;
        const edgeUserMessage = `Created:\n${nodeIds}\n\n**CRITICAL: You MUST call create_edge for EACH connection in this request: "${prompt}"\n\nDo NOT respond with text. ONLY use the create_edge tool multiple times.**`;

        console.log("Requesting edge creation with node IDs:", nodeIds);

        const edgeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            messages: [{ role: 'user', content: edgeUserMessage }],
            system: edgeSystemPrompt,
            tools,
            tool_choice: { type: "any" }  // Force tool usage
          })
        });

        console.log("Edge creation response status:", edgeResp.status);

        if (edgeResp.ok) {
          const edgeData = await edgeResp.json();
          console.log("Edge creation Claude response:", JSON.stringify(edgeData, null, 2));
          
          // Parse Claude tool calls
          const edgeToolCalls = [];
          for (const content of edgeData.content) {
            if (content.type === 'tool_use') {
              edgeToolCalls.push({
                id: content.id,
                function: {
                  name: content.name,
                  arguments: JSON.stringify(content.input)
                }
              });
            }
          }
          console.log(`Executing ${edgeToolCalls.length} edge creation calls`);
          
          for (const tc of edgeToolCalls) {
            try {
              const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
              console.log(`Created edge: ${tc.function.name}`, JSON.parse(tc.function.arguments));
              toolResults.push({ tool: tc.function.name, args: JSON.parse(tc.function.arguments), result });
            } catch (e) { 
              console.error("Edge creation error:", e); 
            }
          }
          outputText = "Created nodes and connected them!";
        } else {
          console.error("Edge creation request failed:", await edgeResp.text());
        }
      }
      // Case 2: Only deleted - user wants to create after
      else if (hasDeletes && prompt.toLowerCase().includes('create')) {
        console.log("Detected delete+create scenario, making follow-up call to create nodes");
        
        const createResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            messages: [{ 
              role: 'user', 
              content: `I deleted the old nodes. Now CREATE the new nodes for this request: "${prompt}"\n\nYou MUST create ALL nodes mentioned in the request. Use create_node for each one.` 
            }],
            system: systemMessage.content,
            tools 
          })
        });

        console.log("Create response status:", createResp.status);

        if (createResp.ok) {
          const createData = await createResp.json();
          console.log("Create response:", JSON.stringify(createData, null, 2));
          const newNodeIds: string[] = [];
          
          // Parse Claude tool calls
          for (const content of createData.content) {
            if (content.type === 'tool_use') {
              try {
                const result = await executeTool(content.name, content.input);
                toolResults.push({ tool: content.name, result });
                if (content.name === 'create_node' && result?.id) {
                  newNodeIds.push(`${result.props.name} (ID: ${result.id})`);
                }
              } catch (e) { 
                console.error("Create node error:", e); 
              }
            }
          }
          
          // Now edges
          if (newNodeIds.length > 0) {
            console.log(`Created ${newNodeIds.length} nodes, now creating edges`);
            
            const edgeResp2 = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ 
                model: 'claude-sonnet-4-5',
                max_tokens: 4096,
                messages: [{ 
                  role: 'user', 
                  content: `Created these nodes:\n${newNodeIds.join('\n')}\n\n**CRITICAL: Now create ALL the edges for this request: "${prompt}"\n\nYou MUST call create_edge for EVERY connection. Do NOT skip any connections!**` 
                }],
                system: systemMessage.content,
                tools,
                tool_choice: { type: "any" }
              })
            });

            console.log("Edge creation (2nd) response status:", edgeResp2.status);

            if (edgeResp2.ok) {
              const edgeData2 = await edgeResp2.json();
              console.log("Edge creation (2nd) response:", JSON.stringify(edgeData2, null, 2));
              
              for (const content of edgeData2.content) {
                if (content.type === 'tool_use') {
                  try {
                    const result = await executeTool(content.name, content.input);
                    console.log(`Created edge:`, content.input);
                    toolResults.push({ tool: content.name, result });
                  } catch (e) { 
                    console.error("Edge creation error:", e); 
                  }
                }
              }
            } else {
              console.error("Edge creation (2nd) failed:", await edgeResp2.text());
            }
          }
          outputText = "Deleted old nodes, created new ones with connections!";
        } else {
          console.error("Create request failed:", await createResp.text());
        }
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
