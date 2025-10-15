
-- Update the workflow steps to reference the actual nodes
UPDATE workflow_steps 
SET config = jsonb_set(config, '{node_id}', '"025c6c69-aa74-4f65-aa1f-c197f01bbee9"')
WHERE workflow_id = '03e0f84c-503d-4785-ab08-d66998dad6a5' 
  AND name IN ('Set Status to Launching', 'Mark as Completed');

UPDATE workflow_steps 
SET config = jsonb_build_object(
  'type', 'MITIGATES',
  'source', '025c6c69-aa74-4f65-aa1f-c197f01bbee9',
  'target', '5babf4e3-026d-4c6d-8600-da94a0685928'
)
WHERE workflow_id = '03e0f84c-503d-4785-ab08-d66998dad6a5' 
  AND name = 'Link to Risk Monitoring';
