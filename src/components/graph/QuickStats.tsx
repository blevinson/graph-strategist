import { useGraphStore } from '@/store/graphStore';
import { nodeTypeConfig, NodeType } from '@/types/graph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const QuickStats = () => {
  const { nodes } = useGraphStore();

  const stats = nodes.reduce((acc, node) => {
    const type = node.data.label as NodeType;
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {} as Record<NodeType, number>);

  const totalNodes = nodes.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Plan Overview</CardTitle>
        <CardDescription className="text-xs">
          Current graph statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Elements</span>
          <Badge variant="secondary">{totalNodes}</Badge>
        </div>
        
        {Object.entries(stats).map(([type, count]) => {
          const config = nodeTypeConfig[type as NodeType];
          if (!config) return null;
          
          return (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span>{config.emoji}</span>
                <span className="text-muted-foreground">{config.label}s</span>
              </span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
