-- Add plans table for versioned planning
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON public.plans FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own plans"
  ON public.plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON public.plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON public.plans FOR DELETE
  USING (auth.uid() = user_id);

-- Add plan_id to nodes
ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE;

-- Add plan_id to edges  
ALTER TABLE public.edges ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE;

-- Create runs table for simulation history
CREATE TABLE IF NOT EXISTS public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  deltas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own runs"
  ON public.runs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own runs"
  ON public.runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_nodes_plan_id ON public.nodes(plan_id);
CREATE INDEX IF NOT EXISTS idx_edges_plan_id ON public.edges(plan_id);
CREATE INDEX IF NOT EXISTS idx_nodes_props ON public.nodes USING GIN(props);
CREATE INDEX IF NOT EXISTS idx_runs_trace ON public.runs USING GIN(trace);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();