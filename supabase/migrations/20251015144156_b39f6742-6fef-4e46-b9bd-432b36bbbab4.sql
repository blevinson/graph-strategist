-- Enable realtime for nodes and edges tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.edges;