# Strategic Graph Orchestrator

A full-stack strategic planning and orchestration platform with React Flow visualization powered by Lovable Cloud.

## 🎯 Features

- **Interactive Graph Canvas**: Pan, zoom, and drag nodes in React Flow
- **7 Strategic Entity Types**: Goal ⭐, Task ⚙️, Agent 🤖, Decision 📄, Capability ⚡, Risk ⚠️, Signal 🔔
- **Relationship Modeling**: 7 relationship types (DEPENDS_ON, ALIGNS_WITH, BLOCKS, etc.)
- **Inspector Panel**: Edit node properties, view connections, analyze dependencies
- **Search & Filter**: Real-time text search across all nodes
- **Special Queries**: 
  - View risks blocking goals
  - View goals impacted by signals
- **Real-time Updates**: Instant UI refresh after CRUD operations
- **Cloud-Powered Backend**: Lovable Cloud provides database and APIs automatically

## 🚀 Quick Start

### No Setup Required!

The application is powered by **Lovable Cloud** - everything is automatically configured:

✅ PostgreSQL database with nodes and edges tables  
✅ Backend APIs for all graph operations  
✅ Real-time updates across all operations  
✅ No Docker or local setup needed

Simply open the app in Lovable and start creating your strategic graph!

## 📦 Project Structure

```
strategic-graph-orchestrator/
├── src/                     # React frontend
│   ├── components/          # UI components
│   │   ├── graph/          # React Flow canvas & nodes
│   │   ├── inspector/      # Inspector panel
│   │   └── toolbar/        # Search & FAB
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript types
│   └── pages/              # Main page
├── supabase/
│   └── functions/
│       └── graph-api/      # Edge function for backend APIs
└── README.md
```

## 🎨 Usage

### Creating Nodes

1. Click the **+** button (bottom-right)
2. Select node type (Goal, Task, Agent, etc.)
3. Enter name and optional properties (status, priority)
4. Click "Create Node"

### Creating Relationships

1. Drag from a node's bottom handle to another node's top handle
2. Select relationship type in the dialog (DEPENDS_ON, BLOCKS, TRIGGERS, etc.)
3. Click "Create"

### Inspecting Nodes

1. Click any node to open the inspector panel
2. View and edit properties
3. See all connections
4. For Goals: Click "Show Blockers" to see blocking risks
5. For Signals: Click "Show Impacted Goals"

### Searching

Use the search bar at the top to filter nodes by name or description in real-time

## 🔧 API Endpoints

All endpoints are handled through the `graph-api` Edge Function:

- `GET /graph-api/graph` - Get all nodes and edges
- `POST /graph-api/nodes` - Create node
- `PATCH /graph-api/nodes/{id}` - Update node
- `DELETE /graph-api/nodes/{id}` - Delete node
- `POST /graph-api/edges` - Create edge
- `DELETE /graph-api/edges/{id}` - Delete edge
- `GET /graph-api/goals/{id}/blockers` - Get risks blocking a goal
- `GET /graph-api/signals/{id}/impacted-goals` - Get goals triggered by signal
- `GET /graph-api/search?q=` - Search nodes

## 🗄️ Database

The app uses PostgreSQL tables managed by Lovable Cloud:

### Tables

**nodes** - Stores all graph nodes
- `id` (UUID): Unique identifier
- `label` (TEXT): Node type (goal, task, agent, decision, capability, risk, signal)
- `props` (JSONB): Node properties (name, status, priority, description, etc.)
- `x`, `y` (FLOAT): Canvas position coordinates
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

**edges** - Stores relationships between nodes
- `id` (UUID): Unique identifier
- `source` (UUID): Source node ID (foreign key to nodes)
- `target` (UUID): Target node ID (foreign key to nodes)
- `type` (TEXT): Relationship type (DEPENDS_ON, ALIGNS_WITH, BLOCKS, ASSIGNED_TO, TRIGGERS, PRODUCES, MITIGATES)
- `created_at` (TIMESTAMP): Creation timestamp

### Example Queries

You can query the database directly through Lovable Cloud:

```sql
-- View all goals
SELECT * FROM nodes WHERE label = 'goal';

-- Find risks blocking goals
SELECT 
  n1.props->>'name' as risk,
  n2.props->>'name' as goal
FROM edges e
JOIN nodes n1 ON e.source = n1.id
JOIN nodes n2 ON e.target = n2.id
WHERE e.type = 'BLOCKS' 
  AND n1.label = 'risk' 
  AND n2.label = 'goal';

-- Find signals triggering goals
SELECT 
  n1.props->>'name' as signal,
  n2.props->>'name' as goal
FROM edges e
JOIN nodes n1 ON e.source = n1.id
JOIN nodes n2 ON e.target = n2.id
WHERE e.type = 'TRIGGERS'
  AND n1.label = 'signal'
  AND n2.label = 'goal';
```

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- React Flow (graph visualization)
- Tailwind CSS (styling with custom design tokens)
- Zustand (state management)
- Shadcn UI (components)
- Sonner (toast notifications)

### Backend
- Lovable Cloud (Supabase-powered)
- PostgreSQL database
- Edge Functions (Deno runtime)
- Row Level Security (RLS) policies

## 🎯 Strategic Entities

### Node Types
- **Goal** ⭐ - Strategic objectives
- **Task** ⚙️ - Actionable work items
- **Agent** 🤖 - Resources or team members
- **Decision** 📄 - Key decisions and choices
- **Capability** ⚡ - Skills, tools, or resources
- **Risk** ⚠️ - Potential blockers or issues
- **Signal** 🔔 - Triggers or events

### Relationship Types
- **DEPENDS_ON** - Task/goal dependencies
- **ALIGNS_WITH** - Strategic alignment
- **BLOCKS** - Risks blocking goals
- **ASSIGNED_TO** - Task assignments
- **TRIGGERS** - Signals triggering actions
- **PRODUCES** - Output relationships
- **MITIGATES** - Risk mitigation

## 📝 Development

The app runs in Lovable's development environment with hot-reload enabled. Changes to the code are reflected immediately in the preview window.

### Backend Management

Access your backend through Lovable Cloud:
- View and manage database tables
- Monitor Edge Function logs
- Configure authentication (if needed)
- Manage storage buckets (if needed)

## 📄 License

MIT License - feel free to use this for your strategic planning needs!

## 🙏 Credits

Built with React Flow and Lovable Cloud for strategic orchestration and dependency modeling.
