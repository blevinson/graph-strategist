-- Create enum types for workflows
CREATE TYPE workflow_mode AS ENUM ('SEQUENTIAL', 'DAG');
CREATE TYPE workflow_step_type AS ENUM ('DELAY', 'HTTP_REQUEST', 'SET_NODE_PROP', 'CREATE_EDGE', 'DELETE_EDGE', 'SQL_QUERY');
CREATE TYPE workflow_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- Create workflows table
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode workflow_mode NOT NULL DEFAULT 'SEQUENTIAL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_steps table
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type workflow_step_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  depends_on TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_runs table
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status workflow_run_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  log JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public read access to workflows"
  ON public.workflows FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to workflows"
  ON public.workflows FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to workflows"
  ON public.workflows FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to workflows"
  ON public.workflows FOR DELETE USING (true);

CREATE POLICY "Allow public read access to workflow_steps"
  ON public.workflow_steps FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to workflow_steps"
  ON public.workflow_steps FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to workflow_steps"
  ON public.workflow_steps FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to workflow_steps"
  ON public.workflow_steps FOR DELETE USING (true);

CREATE POLICY "Allow public read access to workflow_runs"
  ON public.workflow_runs FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to workflow_runs"
  ON public.workflow_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to workflow_runs"
  ON public.workflow_runs FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to workflow_runs"
  ON public.workflow_runs FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON public.workflow_runs(status);