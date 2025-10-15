# System Architecture

## Overview

Graph Strategist is a full-stack application built on React, Supabase, and edge computing. It provides a visual interface for strategic planning with AI-powered simulation and automation capabilities.

## High-Level Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[React UI]
        Canvas[ReactFlow Canvas]
        Store[Zustand Store]
    end
    
    subgraph Backend
        API[Graph API]
        SimAgent[Simulation Agent]
        CoPilot[Co-Pilot Agent]
        StrategyAgent[Strategy Agent]
        WorkflowRunner[Workflow Runner]
    end
    
    subgraph Data
        Nodes[(Nodes Table)]
        Edges[(Edges Table)]
        Workflows[(Workflows)]
        Runs[(Run History)]
    end
    
    UI --> Store
    Canvas --> Store
    Store --> API
    Store --> SimAgent
    Store --> CoPilot
    API --> Nodes
    API --> Edges
    SimAgent --> Nodes
    SimAgent --> Edges
    CoPilot --> Nodes
    CoPilot --> Edges
    WorkflowRunner --> Workflows
    WorkflowRunner --> Runs
```

## Component Architecture

### Frontend Layer

```mermaid
graph LR
    subgraph Pages
        Index[Index Page]
    end
    
    subgraph Components
        GraphCanvas[Graph Canvas]
        NodePalette[Node Palette]
        Inspector[Inspector Panel]
        Simulation[Simulation Panel]
        CoPilot[Co-Pilot Chat]
    end
    
    subgraph State
        GraphStore[Graph Store]
    end
    
    Index --> GraphCanvas
    Index --> NodePalette
    Index --> Inspector
    Index --> Simulation
    Index --> CoPilot
    GraphCanvas --> GraphStore
    NodePalette --> GraphStore
    Inspector --> GraphStore
```

### Backend Layer

```mermaid
graph TB
    subgraph Edge Functions
        GraphAPI[graph-api]
        SimAgent[simulation-agent]
        AgentRespond[agent-respond]
        SimRespond[agent-respond-simulation]
        StratAgent[strategy-agent]
        WorkflowAPI[workflow-api]
        WorkflowRunner[workflow-runner]
    end
    
    subgraph External
        Claude[Claude API]
        Anthropic[Anthropic SDK]
    end
    
    GraphAPI --> DB[(Database)]
    SimAgent --> Claude
    AgentRespond --> Anthropic
    SimRespond --> Anthropic
    StratAgent --> Anthropic
    WorkflowRunner --> DB
```

## Data Flow

### Node Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Store
    participant API
    participant DB
    
    User->>UI: Create Node
    UI->>Store: createNode()
    Store->>API: POST /nodes
    API->>DB: INSERT node
    DB-->>API: Node data
    API-->>Store: Node created
    Store->>Store: Update local state
    Store-->>UI: Trigger re-render
    UI-->>User: Display new node
```

### Simulation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Store
    participant SimAgent
    participant Claude
    participant DB
    
    User->>UI: Run Simulation
    UI->>Store: runSimulation()
    Store->>SimAgent: POST with graph data
    SimAgent->>Claude: Analyze graph
    Claude-->>SimAgent: Analysis results
    SimAgent->>DB: Store deltas
    SimAgent-->>Store: Simulation complete
    Store->>Store: Update history
    Store-->>UI: Show results
    UI-->>User: Display analysis
```

### Workflow Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant WorkflowRunner
    participant DB
    participant Steps
    
    User->>UI: Execute Workflow
    UI->>WorkflowRunner: POST /execute
    WorkflowRunner->>DB: Get workflow steps
    DB-->>WorkflowRunner: Steps data
    
    loop For each step
        WorkflowRunner->>Steps: Execute step
        Steps->>DB: Update data
        Steps-->>WorkflowRunner: Step complete
        WorkflowRunner->>DB: Log step run
    end
    
    WorkflowRunner->>DB: Mark complete
    WorkflowRunner-->>UI: Execution results
```

## State Management

### Zustand Store Architecture

```mermaid
graph TB
    subgraph Store State
        Nodes[nodes: Node[]]
        Edges[edges: Edge[]]
        Selected[selectedNode: string]
        ActiveRun[activeWorkflowRun: string]
        SimHistory[simulationHistory: Result[]]
    end
    
    subgraph Actions
        Fetch[fetchGraph]
        Create[createNode/Edge]
        Update[updateNode/Position]
        Delete[deleteNode/Edge]
        RunSim[runSimulation]
        Subscribe[subscribeToChanges]
    end
    
    Actions --> Nodes
    Actions --> Edges
    Actions --> Selected
    Actions --> ActiveRun
    Actions --> SimHistory
```

## Real-time Updates

### Subscription Architecture

```mermaid
graph LR
    subgraph Supabase
        NodesTable[(Nodes)]
        EdgesTable[(Edges)]
        WorkflowRuns[(Workflow Runs)]
        StepRuns[(Step Runs)]
    end
    
    subgraph Channels
        NodesChannel[nodes-changes]
        EdgesChannel[edges-changes]
        WorkflowChannel[workflow-execution]
    end
    
    subgraph Store
        GraphStore[Graph Store]
    end
    
    NodesTable -.->|postgres_changes| NodesChannel
    EdgesTable -.->|postgres_changes| EdgesChannel
    WorkflowRuns -.->|postgres_changes| WorkflowChannel
    StepRuns -.->|postgres_changes| WorkflowChannel
    
    NodesChannel --> GraphStore
    EdgesChannel --> GraphStore
    WorkflowChannel --> GraphStore
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TB
    subgraph Public Access
        GraphAPI[Graph API]
        Workflows[Workflow API]
    end
    
    subgraph Database
        Nodes[(Nodes)]
        Edges[(Edges)]
        WF[(Workflows)]
    end
    
    subgraph RLS Policies
        NodesRLS[Public CRUD]
        EdgesRLS[Public CRUD]
        WFRLS[Public CRUD]
    end
    
    GraphAPI --> NodesRLS
    GraphAPI --> EdgesRLS
    Workflows --> WFRLS
    NodesRLS --> Nodes
    EdgesRLS --> Edges
    WFRLS --> WF
```

> **Note**: Current implementation uses public access for rapid development. Production deployments should implement user authentication and row-level security policies.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **ReactFlow** - Graph visualization
- **Zustand** - State management
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **Vite** - Build tool

### Backend
- **Supabase** - Backend platform
- **PostgreSQL** - Database
- **Edge Functions (Deno)** - Serverless compute
- **Anthropic Claude** - AI capabilities

### Infrastructure
- **Lovable Cloud** - Hosting & deployment
- **Supabase Realtime** - Live updates
- **REST APIs** - Communication layer

## Deployment Architecture

```mermaid
graph TB
    subgraph CDN
        Static[Static Assets]
    end
    
    subgraph Lovable Cloud
        App[React App]
    end
    
    subgraph Supabase
        DB[(PostgreSQL)]
        Functions[Edge Functions]
        Realtime[Realtime Server]
    end
    
    subgraph External
        Claude[Claude API]
    end
    
    Static --> App
    App --> Functions
    App --> Realtime
    Functions --> DB
    Functions --> Claude
    Realtime --> DB
```

## Performance Considerations

### Optimization Strategies

1. **Debounced Updates**
   - Real-time subscriptions debounce for 500ms
   - Prevents rapid re-fetching during bulk operations

2. **Local State First**
   - Optimistic updates in Zustand store
   - Database persists asynchronously

3. **Efficient Queries**
   - Selective field fetching
   - Indexed lookups on node/edge IDs

4. **Edge Function Caching**
   - Tool results cached within conversation
   - Graph state cached between tool calls

## Scalability

### Horizontal Scaling

```mermaid
graph LR
    subgraph Load Distribution
        LB[Load Balancer]
        F1[Edge Function 1]
        F2[Edge Function 2]
        F3[Edge Function N]
    end
    
    subgraph Data Layer
        Primary[(Primary DB)]
        Replica1[(Replica 1)]
        Replica2[(Replica 2)]
    end
    
    LB --> F1
    LB --> F2
    LB --> F3
    F1 --> Primary
    F2 --> Primary
    F3 --> Primary
    Primary -.->|replication| Replica1
    Primary -.->|replication| Replica2
```

### Database Scaling
- Connection pooling via Supavisor
- Read replicas for query distribution
- Partitioning for large node/edge tables
