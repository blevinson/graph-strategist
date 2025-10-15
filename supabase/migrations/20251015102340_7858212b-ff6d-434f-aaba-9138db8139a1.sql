-- Create nodes table
CREATE TABLE IF NOT EXISTS public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create edges table
CREATE TABLE IF NOT EXISTS public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  target UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now since no auth required)
CREATE POLICY "Allow public read access to nodes" ON public.nodes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to nodes" ON public.nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to nodes" ON public.nodes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to nodes" ON public.nodes FOR DELETE USING (true);

CREATE POLICY "Allow public read access to edges" ON public.edges FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to edges" ON public.edges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to edges" ON public.edges FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to edges" ON public.edges FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_nodes_updated_at
BEFORE UPDATE ON public.nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_nodes_label ON public.nodes(label);
CREATE INDEX idx_edges_source ON public.edges(source);
CREATE INDEX idx_edges_target ON public.edges(target);
CREATE INDEX idx_edges_type ON public.edges(type);
CREATE INDEX idx_nodes_props_gin ON public.nodes USING GIN(props);