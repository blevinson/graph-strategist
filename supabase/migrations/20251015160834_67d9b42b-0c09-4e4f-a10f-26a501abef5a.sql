
-- Delete old incorrectly labeled nodes
DELETE FROM nodes WHERE label IN ('Launch MVP', 'Risk Assessment');

-- Update workflow steps to use the new nodes
UPDATE workflow_steps 
SET config = jsonb_set(config, '{node_id}', '"95901fc0-024e-424c-8bb2-77bccc35fd3d"')
WHERE workflow_id = '03e0f84c-503d-4785-ab08-d66998dad6a5' 
  AND name IN ('Set Status to Launching', 'Mark as Completed');

UPDATE workflow_steps 
SET config = jsonb_build_object(
  'type', 'MITIGATES',
  'source', '95901fc0-024e-424c-8bb2-77bccc35fd3d',
  'target', 'bbc08176-f683-4161-b313-facda9acbfc6'
)
WHERE workflow_id = '03e0f84c-503d-4785-ab08-d66998dad6a5' 
  AND name = 'Link to Risk Monitoring';
