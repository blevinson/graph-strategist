from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from neo4j import GraphDatabase
import os
import uuid

app = FastAPI(title="Strategic Graph Orchestrator API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Models
class NodeCreate(BaseModel):
    label: str
    props: Dict[str, Any]

class NodeUpdate(BaseModel):
    props: Dict[str, Any]

class EdgeCreate(BaseModel):
    source: str
    target: str
    type: str

# Helper functions
def serialize_node(node):
    return {
        "id": node["id"],
        "label": node["label"],
        "props": dict(node),
        "position": {"x": node.get("x", 0), "y": node.get("y", 0)}
    }

def serialize_edge(rel):
    return {
        "id": rel.element_id,
        "source": rel.start_node["id"],
        "target": rel.end_node["id"],
        "type": rel.type
    }

# Endpoints
@app.get("/")
def root():
    return {"message": "Strategic Graph Orchestrator API", "status": "running"}

@app.get("/graph")
def get_graph():
    """Return all nodes and edges"""
    with driver.session() as session:
        # Get all nodes
        nodes_result = session.run("""
            MATCH (n)
            RETURN n
        """)
        nodes = [serialize_node(record["n"]) for record in nodes_result]
        
        # Get all edges
        edges_result = session.run("""
            MATCH (a)-[r]->(b)
            RETURN r, a, b
        """)
        edges = [serialize_edge(record["r"]) for record in edges_result]
        
        return {"nodes": nodes, "edges": edges}

@app.post("/nodes")
def create_node(node: NodeCreate):
    """Create a new node"""
    node_id = str(uuid.uuid4())
    props = {**node.props, "id": node_id, "label": node.label}
    
    with driver.session() as session:
        result = session.run(f"""
            CREATE (n:{node.label.capitalize()})
            SET n = $props
            RETURN n
        """, props=props)
        
        created_node = result.single()["n"]
        return serialize_node(created_node)

@app.patch("/nodes/{node_id}")
def update_node(node_id: str, update: NodeUpdate):
    """Update node properties"""
    with driver.session() as session:
        result = session.run("""
            MATCH (n {id: $node_id})
            SET n += $props
            RETURN n
        """, node_id=node_id, props=update.props)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Node not found")
        
        return serialize_node(record["n"])

@app.delete("/nodes/{node_id}")
def delete_node(node_id: str):
    """Delete a node and its edges"""
    with driver.session() as session:
        result = session.run("""
            MATCH (n {id: $node_id})
            DETACH DELETE n
            RETURN count(n) as deleted
        """, node_id=node_id)
        
        deleted = result.single()["deleted"]
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Node not found")
        
        return {"message": "Node deleted successfully"}

@app.post("/edges")
def create_edge(edge: EdgeCreate):
    """Create a new edge"""
    with driver.session() as session:
        result = session.run(f"""
            MATCH (a {{id: $source}}), (b {{id: $target}})
            CREATE (a)-[r:{edge.type}]->(b)
            RETURN r, a, b
        """, source=edge.source, target=edge.target)
        
        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Source or target node not found")
        
        return serialize_edge(record["r"])

@app.delete("/edges/{edge_id}")
def delete_edge(edge_id: str):
    """Delete an edge"""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r]->()
            WHERE elementId(r) = $edge_id
            DELETE r
            RETURN count(r) as deleted
        """, edge_id=edge_id)
        
        deleted = result.single()["deleted"]
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Edge not found")
        
        return {"message": "Edge deleted successfully"}

@app.get("/goals/{goal_id}/blockers")
def get_goal_blockers(goal_id: str):
    """Get all risks blocking a goal"""
    with driver.session() as session:
        result = session.run("""
            MATCH (g:Goal {id: $goal_id})<-[:BLOCKS]-(r:Risk)
            RETURN r
        """, goal_id=goal_id)
        
        return [serialize_node(record["r"]) for record in result]

@app.get("/signals/{signal_id}/impacted-goals")
def get_signal_impacted_goals(signal_id: str):
    """Get all goals triggered by a signal"""
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Signal {id: $signal_id})-[:TRIGGERS]->(g:Goal)
            RETURN g
        """, signal_id=signal_id)
        
        return [serialize_node(record["g"]) for record in result]

@app.get("/search")
def search_nodes(q: str):
    """Text search across nodes"""
    with driver.session() as session:
        result = session.run("""
            MATCH (n)
            WHERE n.name CONTAINS $query OR n.description CONTAINS $query
            RETURN n
        """, query=q)
        
        return [serialize_node(record["n"]) for record in result]

@app.on_event("shutdown")
def shutdown_event():
    driver.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
