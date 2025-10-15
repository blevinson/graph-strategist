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
      description: "Create a new node with a label and properties",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string", description: "Node type (e.g., Goal, Task, Signal, Risk)" },
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
          type: { type: "string", description: "Relationship type (e.g., DEPENDS_ON, BLOCKS, TRIGGERS)" }
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

    const messages = [
      {
        role: "system",
        content: "You are a strategic orchestration agent. Your job is to help build, manage, and run graph-based workflows using typed tools. When users ask to create nodes, use appropriate labels like Goal, Task, Signal, Risk, etc. Always use the available tools to perform operations."
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
        model: 'openai/gpt-5-mini',
        messages,
        tools,
        tool_choice: "auto"
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

    // If there were tool calls, make a second request to get the final response
    let outputText = message.content || "";
    
    if (toolCalls.length > 0) {
      const followUpMessages = [
        ...messages,
        message,
        ...toolCalls.map((tc: any, i: number) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResults[i].result || toolResults[i].error)
        }))
      ];

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: followUpMessages
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        outputText = followUpData.choices[0].message.content;
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
