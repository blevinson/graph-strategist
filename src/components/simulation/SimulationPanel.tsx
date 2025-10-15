import { useGraphStore } from '@/store/graphStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Activity } from 'lucide-react';

export const SimulationPanel = () => {
  const { simulationHistory, simulationStatus } = useGraphStore();

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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold">Simulation History</h3>
        <p className="text-sm text-muted-foreground">
          AI-powered strategy analysis results
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {simulationStatus && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Current Simulation</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    {getStatusIcon(simulationStatus)}
                    {simulationStatus}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          {simulationHistory.length === 0 && !simulationStatus && (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No simulations run yet</p>
              <p className="text-xs mt-1">Click "Run Simulation" to analyze your plan</p>
            </div>
          )}

          {simulationHistory.map((sim, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Run #{simulationHistory.length - index}</CardTitle>
                  {getStatusIcon(sim.status)}
                </div>
                <CardDescription className="text-xs">
                  {new Date(sim.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{sim.rationale}</p>
                {sim.deltas && sim.deltas.log && sim.deltas.log.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {sim.deltas.log.map((entry: any, i: number) => (
                      <p key={i} className="text-xs font-mono bg-muted p-2 rounded">
                        {entry.msg}
                      </p>
                    ))}
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
