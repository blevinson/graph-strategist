import GraphCanvas from '@/components/graph/GraphCanvas';
import InspectorPanel from '@/components/inspector/InspectorPanel';
import SearchBar from '@/components/toolbar/SearchBar';
import AddNodeFAB from '@/components/toolbar/AddNodeFAB';
import WorkflowPanel from '@/components/workflows/WorkflowPanel';
import { ReactFlowProvider } from 'reactflow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Strategic Graph Orchestrator
            </h1>
          </div>
          <SearchBar />
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative">
            <GraphCanvas />
          </div>
          <div className="w-96 border-l border-border bg-card overflow-hidden flex flex-col">
            <Tabs defaultValue="inspector" className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="inspector" className="flex-1">Inspector</TabsTrigger>
                <TabsTrigger value="workflows" className="flex-1">Workflows</TabsTrigger>
              </TabsList>
              <TabsContent value="inspector" className="flex-1 overflow-auto m-0">
                <InspectorPanel />
              </TabsContent>
              <TabsContent value="workflows" className="flex-1 overflow-auto m-0">
                <WorkflowPanel />
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
