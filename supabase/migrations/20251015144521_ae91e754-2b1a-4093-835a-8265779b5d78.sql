-- Add node_id to workflows table to link workflows to specific nodes
ALTER TABLE workflows ADD COLUMN node_id uuid REFERENCES nodes(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_workflows_node_id ON workflows(node_id);