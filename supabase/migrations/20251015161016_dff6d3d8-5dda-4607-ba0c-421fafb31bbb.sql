
-- Delete the older duplicate workflow and its steps
DELETE FROM workflow_steps WHERE workflow_id = '5d84df6e-e3ea-428e-acf3-278b3ad66c7d';
DELETE FROM workflows WHERE id = '5d84df6e-e3ea-428e-acf3-278b3ad66c7d';
