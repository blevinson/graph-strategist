import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useGraphStore } from '@/store/graphStore';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
}

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-respond`;

export const CoPilotChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your Graph Strategist co-pilot. I can help you build and modify your strategy graph.\n\n**Quick Start - Click to build a complete example:**\n\n- \"Create a signal called 'New user signup' that triggers a decision 'Is premium user?' which branches to outcome 'Premium onboarding' and outcome 'Free tier onboarding'\"\n- \"Add a goal 'Launch mobile app' with tasks 'Design UI', 'Build backend API', and 'Submit to app stores' where each task depends on the previous one\"\n- \"Create a signal 'Customer complaint received' that triggers task 'Investigate issue' which depends on task 'Assign support agent'\"\n\n**Or try individual commands:**\n- \"Show me all my nodes\"\n- \"Delete the task called 'X'\"\n- \"Update the goal 'Y' to have higher priority\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { fetchGraph, copilotMessage, setCopilotMessage } = useGraphStore();

  // Handle incoming copilot messages from other components
  useEffect(() => {
    if (copilotMessage) {
      setInput(copilotMessage);
      setCopilotMessage(null);
      // Auto-send the message
      setTimeout(() => {
        handleSend();
      }, 100);
    }
  }, [copilotMessage]);

  useEffect(() => {
    const scrollToBottom = () => {
      const element = scrollRef.current;
      if (element) {
        console.log('Scrolling - scrollHeight:', element.scrollHeight, 'scrollTop:', element.scrollTop);
        element.scrollTop = element.scrollHeight;
        console.log('After scroll - scrollTop:', element.scrollTop);
      }
    };
    
    // Multiple approaches to ensure scroll happens
    scrollToBottom();
    setTimeout(scrollToBottom, 0);
    setTimeout(scrollToBottom, 100);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from co-pilot');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.output_text || 'Done!',
        timestamp: new Date(),
        toolCalls: data.tool_results,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh graph if tools were used
      if (data.tool_results && data.tool_results.length > 0) {
        await fetchGraph();
        toast({
          title: 'Graph Updated',
          description: `${data.tool_results.length} action(s) completed`,
        });
      }
    } catch (error) {
      console.error('Co-pilot error:', error);
      toast({
        title: 'Co-Pilot Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">AI Co-Pilot</h3>
            <p className="text-xs text-muted-foreground">
              Your intelligent planning assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar" ref={scrollRef}>
        <div className="space-y-4 pb-24">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}

              <Card
                className={`max-w-[80%] p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <div className="text-sm prose prose-sm max-w-none">
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Actions taken:
                    </p>
                    <div className="space-y-1">
                      {message.toolCalls.map((tool, i) => (
                        <div key={i} className="text-xs font-mono bg-muted/50 p-1.5 rounded">
                          {tool.tool}{' '}
                          {tool.error && (
                            <span className="text-destructive">❌ {tool.error}</span>
                          )}
                          {tool.result && !tool.error && (
                            <span className="text-green-500">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </Card>

              {message.role === 'user' && (
                <div className="shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-accent" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 mt-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <Card className="p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </Card>
            </div>
          )}
          
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to add goals, tasks, or modify the graph..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
