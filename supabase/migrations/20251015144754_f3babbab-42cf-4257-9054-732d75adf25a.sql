-- Link the existing Risk Monitoring Workflow to the Launch MVP node
UPDATE workflows 
SET node_id = '4fdc3ce8-40b2-48fe-a068-d2ca006284b0' 
WHERE id = 'f96f880c-5ca8-4310-b42a-6944c383cceb';