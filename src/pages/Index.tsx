import React from 'react';
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
import { Play, Info, LayoutGrid } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useGraphStore } from '@/store/graphStore';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { runSimulation, nodes, updateNodePosition } = useGraphStore();
  const [activeLeftTab, setActiveLeftTab] = React.useState('palette');
  const [activeRightTab, setActiveRightTab] = React.useState('inspector');

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

  const handleAutoLayout = () => {
    // Simple hierarchical layout algorithm
    const nodesByType = new Map<string, typeof nodes>();
    
    nodes.forEach(node => {
      const type = node.data.label;
      if (!nodesByType.has(type)) {
        nodesByType.set(type, []);
      }
      nodesByType.get(type)!.push(node);
    });

    const typeOrder = ['goal', 'milestone', 'task', 'decision', 'signal', 'blocker', 'resource'];
    let currentY = 100;
    const columnWidth = 300;
    const rowHeight = 150;

    typeOrder.forEach(type => {
      const typeNodes = nodesByType.get(type) || [];
      typeNodes.forEach((node, index) => {
        const x = 100 + (index % 3) * columnWidth;
        const y = currentY + Math.floor(index / 3) * rowHeight;
        updateNodePosition(node.id, x, y);
      });
      if (typeNodes.length > 0) {
        currentY += Math.ceil(typeNodes.length / 3) * rowHeight + 50;
      }
    });

    toast({
      title: "Layout Applied",
      description: "Nodes have been automatically arranged",
    });
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
            <Button onClick={handleAutoLayout} variant="outline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Auto Layout
            </Button>
            <Button onClick={handleRunSimulation} className="gap-2">
              <Play className="h-4 w-4" />
              Run Simulation
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden" id="main-content">
          <ResizablePanelGroup direction="horizontal" storage={localStorage} autoSaveId="graph-strategist-layout">
            {/* Left Sidebar - Palette & Co-Pilot */}
            <ResizablePanel id="left-sidebar" defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full border-r border-border bg-card flex flex-col">
                <Tabs value={activeLeftTab} onValueChange={setActiveLeftTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full rounded-none border-b shrink-0">
                    <TabsTrigger value="palette" className="flex-1">Palette</TabsTrigger>
                    <TabsTrigger value="copilot" className="flex-1">Co-Pilot</TabsTrigger>
                  </TabsList>
                  <TabsContent value="palette" className="flex-1 m-0 overflow-hidden">
                    <div className="h-full overflow-y-auto p-4 pb-24 custom-scrollbar">
                      <NodePalette />
                    </div>
                  </TabsContent>
                  <TabsContent value="copilot" className="flex-1 m-0 overflow-hidden">
                    <CoPilotChat />
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Graph Canvas */}
            <ResizablePanel id="graph-canvas" defaultSize={55} minSize={30}>
              <div className="h-full relative">
                <GraphCanvas />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Sidebar - Inspector & Simulation */}
            <ResizablePanel id="right-sidebar" defaultSize={25} minSize={20} maxSize={40}>
              <div className="h-full border-l border-border bg-card flex flex-col">
                <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full rounded-none border-b shrink-0">
                    <TabsTrigger value="inspector" className="flex-1">
                      <Info className="h-4 w-4 mr-2" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="simulation" className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Simulation
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="inspector" className="flex-1 m-0 overflow-hidden">
                    <InspectorPanel />
                  </TabsContent>
                  <TabsContent value="simulation" className="flex-1 m-0 overflow-hidden">
                    <SimulationPanel onSwitchToCopilot={() => setActiveLeftTab('copilot')} />
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* FAB */}
        <AddNodeFAB />
      </div>
    </ReactFlowProvider>
  );
};

export default Index;
