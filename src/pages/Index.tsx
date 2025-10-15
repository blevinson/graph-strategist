import GraphCanvas from '@/components/graph/GraphCanvas';
import InspectorPanel from '@/components/inspector/InspectorPanel';
import SearchBar from '@/components/toolbar/SearchBar';
import AddNodeFAB from '@/components/toolbar/AddNodeFAB';
import { ReactFlowProvider } from 'reactflow';

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
          <InspectorPanel />
        </div>

        {/* FAB */}
        <AddNodeFAB />
      </div>
    </ReactFlowProvider>
  );
};

export default Index;
