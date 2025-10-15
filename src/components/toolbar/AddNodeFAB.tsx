import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NodeType, nodeTypeConfig } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { toast } from 'sonner';

export default function AddNodeFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [nodeType, setNodeType] = useState<NodeType>('goal');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const { createNode } = useGraphStore();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await createNode(nodeType, name, { status, priority });
      toast.success('Node created successfully');
      setIsOpen(false);
      setName('');
      setStatus('');
      setPriority('');
    } catch (error) {
      toast.error('Failed to create node');
    }
  };

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Node</DialogTitle>
            <DialogDescription>
              Add a new strategic entity to your graph
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="node-type">Node Type</Label>
              <Select
                value={nodeType}
                onValueChange={(value) => setNodeType(value as NodeType)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(nodeTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{config.emoji}</span>
                        <span>{config.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border"
                placeholder="Enter node name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-background border-border"
                placeholder="e.g., In Progress, Completed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-background border-border"
                placeholder="e.g., High, Medium, Low"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Node</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
