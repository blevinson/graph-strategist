# Strategic Graph Orchestrator

A full-stack strategic planning and orchestration platform with React Flow visualization, FastAPI backend, and Neo4j graph database.

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
- **Persistent Graph Database**: Neo4j stores your strategic model

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker Compose

1. **Clone and start all services:**

```bash
docker compose up --build
```

This starts:
- **Neo4j** at http://localhost:7474 (browser UI)
- **FastAPI** at http://localhost:8000 (API docs at /docs)
- **React Frontend** at http://localhost:8080

2. **Access the app:**

Open http://localhost:8080 in your browser

### Local Development (Frontend Only)

If you want to run the frontend locally while using Docker for backend:

```bash
# Start only backend services
docker compose up neo4j backend

# In another terminal, run frontend locally
npm install
npm run dev
```

Create a `.env.local` file:
```
VITE_API_URL=http://localhost:8000
```

## 📦 Project Structure

```
strategic-graph-orchestrator/
├── backend/               # FastAPI application
│   ├── main.py           # API routes and Neo4j queries
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile
├── src/                  # React frontend
│   ├── components/       # UI components
│   │   ├── graph/       # React Flow canvas & nodes
│   │   ├── inspector/   # Inspector panel
│   │   └── toolbar/     # Search & FAB
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript types
│   └── pages/           # Main page
├── docker-compose.yml    # Multi-service orchestration
└── README.md
```

## 🎨 Usage

### Creating Nodes

1. Click the **+** button (bottom-right)
2. Select node type
3. Enter name and optional properties
4. Click "Create Node"

### Creating Relationships

1. Drag from a node's bottom handle to another node's top handle
2. Select relationship type in the dialog
3. Click "Create"

### Inspecting Nodes

1. Click any node to open the inspector panel
2. View and edit properties
3. See all connections
4. For Goals: Click "Show Blockers" to see blocking risks
5. For Signals: Click "Show Impacted Goals"

### Searching

Use the search bar at the top to filter nodes by name or description

## 🔧 API Endpoints

- `GET /graph` - Get all nodes and edges
- `POST /nodes` - Create node
- `PATCH /nodes/{id}` - Update node
- `DELETE /nodes/{id}` - Delete node
- `POST /edges` - Create edge
- `DELETE /edges/{id}` - Delete edge
- `GET /goals/{id}/blockers` - Get risks blocking a goal
- `GET /signals/{id}/impacted-goals` - Get goals triggered by signal
- `GET /search?q=` - Search nodes

Full API documentation: http://localhost:8000/docs

## 🗄️ Database

Neo4j browser UI: http://localhost:7474

Default credentials:
- Username: `neo4j`
- Password: `neo4j_password_change_me`

**Change the password** in `docker-compose.yml` and `backend/.env` for production!

## 🎯 Example Cypher Queries

```cypher
// View all goals and their blockers
MATCH (g:Goal)<-[:BLOCKS]-(r:Risk)
RETURN g.name, collect(r.name) as blockers

// Find critical path (goals with most dependencies)
MATCH (g:Goal)<-[:DEPENDS_ON*]-(n)
RETURN g.name, count(n) as dependencies
ORDER BY dependencies DESC

// View signals and triggered goals
MATCH (s:Signal)-[:TRIGGERS]->(g:Goal)
RETURN s.name, collect(g.name) as triggered_goals
```

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- React Flow (graph visualization)
- Tailwind CSS (styling)
- Zustand (state management)
- Axios (API client)
- Shadcn UI (components)

### Backend
- FastAPI (Python web framework)
- Neo4j Python Driver
- Pydantic (data validation)

### Infrastructure
- Docker & Docker Compose
- Neo4j 5.15 Community with APOC plugin

## 📝 Environment Variables

### Backend
```
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password_change_me
```

### Frontend
```
VITE_API_URL=http://localhost:8000
```

## 🚢 Production Deployment

1. **Update credentials** in docker-compose.yml
2. **Set secure passwords** for Neo4j
3. **Configure CORS** in backend/main.py
4. **Use environment-specific .env files**
5. **Set up reverse proxy** (nginx/Traefik) for HTTPS
6. **Configure Neo4j** for production workloads

## 📄 License

MIT License - feel free to use this for your strategic planning needs!

## 🙏 Credits

Built with React Flow, FastAPI, and Neo4j for strategic orchestration and dependency modeling.
