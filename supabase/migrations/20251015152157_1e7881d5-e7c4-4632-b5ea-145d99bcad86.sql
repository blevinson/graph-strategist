-- Add step_runs table for tracking individual step execution
CREATE TABLE IF NOT EXISTS public.step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status workflow_run_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  log JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add position column to workflow_steps for ordering
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Add description to workflows
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS description TEXT;

-- Add meta column to workflow_runs for additional metadata
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- Add RLS policies
ALTER TABLE step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to step_runs"
  ON step_runs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to step_runs"
  ON step_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to step_runs"
  ON step_runs FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to step_runs"
  ON step_runs FOR DELETE
  USING (true);

-- Add EMIT_SIGNAL step type to enum
ALTER TYPE workflow_step_type ADD VALUE IF NOT EXISTS 'EMIT_SIGNAL';