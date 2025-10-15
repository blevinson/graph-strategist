
-- Clean up the old workflow that had the wrong node references
DELETE FROM workflow_steps WHERE workflow_id = '03e0f84c-503d-4785-ab08-d66998dad6a5';
DELETE FROM workflows WHERE id = '03e0f84c-503d-4785-ab08-d66998dad6a5';
