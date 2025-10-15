
-- Add inputs/outputs and strategic context to nodes
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS inputs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS outputs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}'::jsonb;

-- Create a table for AI strategic insights
CREATE TABLE IF NOT EXISTS strategic_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  insight_type text NOT NULL, -- 'recommendation', 'risk', 'opportunity', 'decision'
  content text NOT NULL,
  confidence decimal(3,2), -- 0.00 to 1.00
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE strategic_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to strategic_insights" 
ON strategic_insights FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to strategic_insights" 
ON strategic_insights FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to strategic_insights" 
ON strategic_insights FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to strategic_insights" 
ON strategic_insights FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE strategic_insights;
ALTER TABLE strategic_insights REPLICA IDENTITY FULL;
