
-- Remove the "Create Edge" step since the edge already exists
DELETE FROM workflow_steps 
WHERE workflow_id = 'ca434d1b-19d4-46c6-bd31-a2dfbd281467' 
  AND name = 'Link to Risk Assessment';

-- Update positions of remaining steps
UPDATE workflow_steps 
SET position = 4 
WHERE workflow_id = 'ca434d1b-19d4-46c6-bd31-a2dfbd281467' 
  AND name = 'Emit Success Signal';
