-- Delete all existing workflows and related data
DELETE FROM step_runs;
DELETE FROM workflow_runs;
DELETE FROM workflow_steps;
DELETE FROM workflows;

-- Create a sample "Project Launch Automation" workflow
INSERT INTO workflows (name, description, mode, created_at)
VALUES (
  'Project Launch Automation',
  'Automated workflow that updates project status, sends notifications, and creates tracking edges',
  'SEQUENTIAL',
  now()
)
RETURNING id;

-- Store the workflow ID for use in steps
DO $$
DECLARE
  workflow_uuid UUID;
BEGIN
  -- Get the workflow ID we just created
  SELECT id INTO workflow_uuid FROM workflows WHERE name = 'Project Launch Automation' LIMIT 1;
  
  -- Add workflow steps
  INSERT INTO workflow_steps (workflow_id, name, type, config, depends_on, position, created_at)
  VALUES
    -- Step 1: Initial delay to simulate preparation
    (workflow_uuid, 'Prepare Launch', 'DELAY', 
     '{"milliseconds": 2000}'::jsonb, 
     ARRAY[]::text[], 0, now()),
     
    -- Step 2: Update MVP goal status to "launching"
    (workflow_uuid, 'Set Status to Launching', 'SET_NODE_PROP',
     '{"node_id": "4fdc3ce8-40b2-48fe-a068-d2ca006284b0", "prop_name": "status", "prop_value": "launching"}'::jsonb,
     ARRAY[]::text[], 1, now()),
     
    -- Step 3: Another delay to simulate launch process
    (workflow_uuid, 'Execute Launch', 'DELAY',
     '{"milliseconds": 3000}'::jsonb,
     ARRAY[]::text[], 2, now()),
     
    -- Step 4: Update MVP goal status to "completed"
    (workflow_uuid, 'Mark as Completed', 'SET_NODE_PROP',
     '{"node_id": "4fdc3ce8-40b2-48fe-a068-d2ca006284b0", "prop_name": "status", "prop_value": "completed"}'::jsonb,
     ARRAY[]::text[], 3, now()),
     
    -- Step 5: Create edge between MVP goal and risk node
    (workflow_uuid, 'Link to Risk Monitoring', 'CREATE_EDGE',
     '{"source": "4fdc3ce8-40b2-48fe-a068-d2ca006284b0", "target": "635d669a-f834-481a-a03e-e50eb721acdd", "type": "MITIGATES"}'::jsonb,
     ARRAY[]::text[], 4, now()),
     
    -- Step 6: Emit completion signal
    (workflow_uuid, 'Emit Success Signal', 'EMIT_SIGNAL',
     '{"signal_name": "project_launched", "payload": {"project": "MVP", "timestamp": "2025-10-15"}}'::jsonb,
     ARRAY[]::text[], 5, now());
END $$;