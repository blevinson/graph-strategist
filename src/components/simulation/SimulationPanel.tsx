import { useState } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle2, XCircle, Activity, Zap, Loader2, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface SimulationResult {
  timestamp: Date;
  scenario: string;
  analysis: string;
  actions_taken: number;
  tool_results?: any[];
  status: 'completed' | 'failed';
}

interface SimulationPanelProps {
  onSwitchToCopilot: () => void;
}

export const SimulationPanel = ({ onSwitchToCopilot }: SimulationPanelProps) => {
  const [scenario, setScenario] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([]);
  const { setCopilotMessage } = useGraphStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const quickScenarios = [
    "Simulate what happens when a new user signs up",
    "Analyze the impact of a customer complaint",
    "What are the critical paths to achieving our goals?",
    "Identify bottlenecks in the current workflow",
    "Make recommendations to improve this strategy"
  ];

  const handleRunSimulation = async () => {
    if (!scenario.trim()) {
      toast({
        title: "Scenario Required",
        description: "Please describe what you want to simulate",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulation-agent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ scenario })
        }
      );

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const result = await response.json();

      const simulationResult: SimulationResult = {
        timestamp: new Date(),
        scenario: scenario,
        analysis: result.analysis,
        actions_taken: result.actions_taken,
        tool_results: result.tool_results,
        status: 'completed'
      };

      setSimulationHistory(prev => [simulationResult, ...prev]);
      
      toast({
        title: "Simulation Complete",
        description: `Agent performed ${result.actions_taken} action(s)`
      });

      // Refresh graph to show any status changes
      const { fetchGraph } = useGraphStore.getState();
      await fetchGraph();

      setScenario('');
    } catch (error) {
      console.error('Simulation error:', error);
      
      const failedResult: SimulationResult = {
        timestamp: new Date(),
        scenario: scenario,
        analysis: error instanceof Error ? error.message : 'Unknown error',
        actions_taken: 0,
        status: 'failed'
      };
      
      setSimulationHistory(prev => [failedResult, ...prev]);
      
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendToCopilot = (simulation: SimulationResult, onSwitchTab: () => void) => {
    const message = `Based on this simulation, please help me fix the identified issues:\n\n**Scenario:** ${simulation.scenario}\n\n**Analysis:**\n${simulation.analysis}\n\nPlease provide specific recommendations and help me implement fixes for these issues.`;
    
    setCopilotMessage(message);
    onSwitchTab();
    
    toast({
      title: "Sent to Co-Pilot",
      description: "Switching to Co-Pilot tab for AI assistance"
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Simulation Agent</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Intelligent scenario analysis and strategic recommendations
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
        <div className="p-4 space-y-4">
          {/* Simulation Input */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Run Simulation</CardTitle>
              <CardDescription className="text-xs">
                Describe what you want to analyze or simulate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g., 'Simulate what happens when a new user signs up' or 'Find bottlenecks in my workflow'"
                className="min-h-[80px] text-sm"
                disabled={isRunning}
              />
              
              <div className="flex flex-wrap gap-2">
                {quickScenarios.map((quick, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setScenario(quick)}
                    disabled={isRunning}
                    className="text-xs h-7"
                  >
                    {quick}
                  </Button>
                ))}
              </div>

              <Button
                onClick={handleRunSimulation}
                disabled={isRunning || !scenario.trim()}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Simulation History */}
          {simulationHistory.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No simulations run yet</p>
              <p className="text-xs mt-1">Enter a scenario above to analyze your strategy</p>
            </div>
          )}

          {simulationHistory.map((sim, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Run #{simulationHistory.length - index}</CardTitle>
                  <Badge variant={sim.status === 'completed' ? 'default' : 'destructive'} className="gap-1">
                    {getStatusIcon(sim.status)}
                    {sim.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {sim.timestamp.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Scenario:</p>
                  <p className="text-sm font-medium">{sim.scenario}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Analysis:</p>
                  <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{sim.analysis}</ReactMarkdown>
                  </div>
                  
                  {sim.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full gap-2"
                      onClick={() => handleSendToCopilot(sim, onSwitchToCopilot)}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Send to Co-Pilot for Fixes
                    </Button>
                  )}
                </div>

                {sim.tool_results && sim.tool_results.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Actions Taken ({sim.actions_taken}):
                    </p>
                    <div className="space-y-2">
                      {sim.tool_results.map((tool, i) => (
                        <div key={i} className="text-xs bg-muted/50 p-2 rounded">
                          <div className="font-semibold text-primary mb-1">
                            🔧 {tool.tool}
                          </div>
                          <pre className="text-[10px] overflow-x-auto">
                            {JSON.stringify(tool.result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
