import GraphCanvas from '@/components/graph/GraphCanvas';
import InspectorPanel from '@/components/inspector/InspectorPanel';
import SearchBar from '@/components/toolbar/SearchBar';
import AddNodeFAB from '@/components/toolbar/AddNodeFAB';
import { SimulationPanel } from '@/components/simulation/SimulationPanel';
import { NodePalette } from '@/components/graph/NodePalette';
import { CoPilotChat } from '@/components/copilot/CoPilotChat';
import { ReactFlowProvider } from 'reactflow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, Info } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { runSimulation } = useGraphStore();

  const handleRunSimulation = async () => {
    try {
      await runSimulation();
      toast({
        title: "Simulation Started",
        description: "Analyzing your plan logic...",
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Graph Strategist
            </h1>
            <span className="text-sm text-muted-foreground">Visual Strategy Planning</span>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar />
            <Button onClick={handleRunSimulation} className="gap-2">
              <Play className="h-4 w-4" />
              Run Simulation
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Palette & Co-Pilot */}
          <div className="w-72 border-r border-border bg-card overflow-hidden flex flex-col">
            <Tabs defaultValue="palette" className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b shrink-0">
                <TabsTrigger value="palette" className="flex-1">Palette</TabsTrigger>
                <TabsTrigger value="copilot" className="flex-1">Co-Pilot</TabsTrigger>
              </TabsList>
              <TabsContent value="palette" className="flex-1 overflow-auto m-0 p-4">
                <NodePalette />
              </TabsContent>
              <TabsContent value="copilot" className="flex-1 m-0 h-0 flex flex-col">
                <CoPilotChat />
              </TabsContent>
            </Tabs>
          </div>

          {/* Graph Canvas */}
          <div className="flex-1 relative">
            <GraphCanvas />
          </div>

          {/* Right Sidebar - Inspector & Simulation */}
          <div className="w-96 border-l border-border bg-card overflow-hidden flex flex-col">
            <Tabs defaultValue="inspector" className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="inspector" className="flex-1">
                  <Info className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="simulation" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Simulation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="inspector" className="flex-1 overflow-auto m-0">
                <InspectorPanel />
              </TabsContent>
              <TabsContent value="simulation" className="flex-1 m-0 h-0 flex flex-col">
                <SimulationPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* FAB */}
        <AddNodeFAB />
      </div>
    </ReactFlowProvider>
  );
};

export default Index;
