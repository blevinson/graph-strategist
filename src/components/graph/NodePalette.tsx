import { nodeTypeConfig, NodeType } from '@/types/graph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGraphStore } from '@/store/graphStore';
import { toast } from '@/hooks/use-toast';
import { QuickStats } from './QuickStats';
import { Sparkles } from 'lucide-react';

export const NodePalette = () => {
  const { createNode } = useGraphStore();

  const handleCreateNode = async (type: NodeType) => {
    try {
      const config = nodeTypeConfig[type];
      await createNode(type, `New ${config.label}`, {
        status: type === 'task' ? 'todo' : undefined,
      });
      toast({
        title: "Node Created",
        description: `${config.emoji} ${config.label} added to canvas`,
      });
    } catch (error) {
      toast({
        title: "Failed to create node",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const basicNodes: NodeType[] = ['goal', 'task', 'decision', 'signal', 'outcome'];
  const advancedNodes: NodeType[] = ['risk', 'agent', 'tool'];

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-1">Welcome to Graph Strategist!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Build your strategy visually by adding goals, tasks, and signals. Connect them to see cause-and-effect relationships, then run simulations powered by AI.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Basic Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Elements</CardTitle>
          <CardDescription className="text-xs">
            Essential planning components
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {basicNodes.map((type) => {
            const config = nodeTypeConfig[type];
            return (
              <Button
                key={type}
                variant="outline"
                className="justify-start gap-2 h-auto py-3 hover:bg-accent/10 hover:border-accent"
                onClick={() => handleCreateNode(type)}
              >
                <span className="text-xl">{config.emoji}</span>
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Advanced Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Advanced</CardTitle>
          <CardDescription className="text-xs">
            Power features for complex planning
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {advancedNodes.map((type) => {
            const config = nodeTypeConfig[type];
            return (
              <Button
                key={type}
                variant="outline"
                className="justify-start gap-2 h-auto py-3 hover:bg-accent/10 hover:border-accent"
                onClick={() => handleCreateNode(type)}
              >
                <span className="text-xl">{config.emoji}</span>
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
