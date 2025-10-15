
-- Update the remaining workflow steps to use the correct node IDs
UPDATE workflow_steps 
SET config = jsonb_set(config, '{node_id}', '"95901fc0-024e-424c-8bb2-77bccc35fd3d"')
WHERE workflow_id = 'ca434d1b-19d4-46c6-bd31-a2dfbd281467' 
  AND name IN ('Set Status to Launching', 'Mark as Completed');

UPDATE workflow_steps 
SET config = jsonb_build_object(
  'type', 'MITIGATES',
  'source', '95901fc0-024e-424c-8bb2-77bccc35fd3d',
  'target', 'bbc08176-f683-4161-b313-facda9acbfc6'
)
WHERE workflow_id = 'ca434d1b-19d4-46c6-bd31-a2dfbd281467' 
  AND name = 'Link to Risk Assessment';
