import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGraphStore } from '@/store/graphStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const StrategyPanel = () => {
  const [query, setQuery] = useState('');
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<string>('');
  const selectedNode = useGraphStore(state => state.selectedNode);

  const analyzeStrategy = async () => {
    if (!query.trim() && !selectedNode) {
      toast.error('Please enter a question or select a node');
      return;
    }

    setIsLoading(true);
    setCurrentInsight('');

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/strategy-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query || 'Analyze this node and provide strategic insights',
          nodeId: selectedNode,
          analysisType: 'recommendation'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get strategic insights');
      }

      const data = await response.json();
      
      setCurrentInsight(data.insight);
      setInsights(prev => [{
        id: Date.now(),
        query: query || 'Node analysis',
        insight: data.insight,
        nodeId: selectedNode,
        timestamp: new Date().toISOString()
      }, ...prev]);

      setQuery('');
      toast.success('Strategic analysis complete');
    } catch (error) {
      console.error('Strategy analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze strategy');
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    { icon: TrendingUp, label: 'Optimize Workflow', query: 'What are the optimal strategies to improve this workflow?' },
    { icon: AlertTriangle, label: 'Identify Risks', query: 'What are the main risks and blockers in this plan?' },
    { icon: Brain, label: 'Best Decisions', query: 'What are the best decisions and next steps to take?' },
    { icon: Sparkles, label: 'Find Opportunities', query: 'What opportunities and improvements can you identify?' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Strategy Agent</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-powered strategic analysis and decision support
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Quick Analysis</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto py-3 px-4 flex flex-col items-start gap-2"
                onClick={() => {
                  setQuery(q.query);
                  setTimeout(() => analyzeStrategy(), 100);
                }}
                disabled={isLoading}
              >
                <q.icon className="h-4 w-4 text-primary" />
                <span className="text-xs">{q.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Current Analysis */}
        {currentInsight && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Latest Insight</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentInsight}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Insights */}
        {insights.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Previous Analyses</h3>
            {insights.slice(1).map((insight) => (
              <Card key={insight.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">
                    {insight.query}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {insight.insight}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {insights.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Ask a strategic question or select a node to get AI insights
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-border bg-card/50 shrink-0">
        {selectedNode && (
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" />
            Analyzing selected node
          </Badge>
        )}
        <div className="flex gap-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about strategy, decisions, risks, opportunities..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                analyzeStrategy();
              }
            }}
            disabled={isLoading}
          />
          <Button
            onClick={analyzeStrategy}
            disabled={isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
