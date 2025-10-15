
-- Enable realtime for workflow execution tracking
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE step_runs;

-- Set replica identity for complete row data
ALTER TABLE workflow_runs REPLICA IDENTITY FULL;
ALTER TABLE step_runs REPLICA IDENTITY FULL;
