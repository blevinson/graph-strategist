-- Delete the existing Risk Monitoring Workflow and its steps
DELETE FROM workflow_steps WHERE workflow_id = 'f96f880c-5ca8-4310-b42a-6944c383cceb';
DELETE FROM workflow_runs WHERE workflow_id = 'f96f880c-5ca8-4310-b42a-6944c383cceb';
DELETE FROM workflows WHERE id = 'f96f880c-5ca8-4310-b42a-6944c383cceb';

-- Create a simple Status Update workflow
INSERT INTO workflows (id, name, mode, node_id)
VALUES ('a1b2c3d4-e5f6-4789-a012-345678901234', 'Complete MVP Status', 'SEQUENTIAL', '4fdc3ce8-40b2-48fe-a068-d2ca006284b0');

-- Add a simple step that updates the node's status to completed
INSERT INTO workflow_steps (workflow_id, name, type, config, depends_on)
VALUES (
  'a1b2c3d4-e5f6-4789-a012-345678901234',
  'Mark as Completed',
  'SET_NODE_PROP',
  '{"node_id": "4fdc3ce8-40b2-48fe-a068-d2ca006284b0", "prop_name": "status", "prop_value": "completed"}',
  ARRAY[]::text[]
);