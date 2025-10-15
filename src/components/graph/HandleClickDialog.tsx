import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NodeType, nodeTypeConfig, RelationType, relationTypeConfig } from '@/types/graph';

interface HandleClickDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nodeType: NodeType, nodeName: string, relationType: RelationType) => void;
  handleType: 'source' | 'target';
}

export default function HandleClickDialog({
  isOpen,
  onClose,
  onConfirm,
  handleType,
}: HandleClickDialogProps) {
  const [nodeType, setNodeType] = useState<NodeType>('task');
  const [nodeName, setNodeName] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('depends_on');

  const handleConfirm = () => {
    if (!nodeName.trim()) return;
    onConfirm(nodeType, nodeName.trim(), relationType);
    setNodeName('');
    setNodeType('task');
    setRelationType('depends_on');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Connected Node</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="node-type">Node Type</Label>
            <Select value={nodeType} onValueChange={(value) => setNodeType(value as NodeType)}>
              <SelectTrigger id="node-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <div>
            <Label htmlFor="node-name">Node Name</Label>
            <Input
              id="node-name"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="Enter node name..."
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>

          <div>
            <Label htmlFor="relation-type">Relationship Type</Label>
            <Select value={relationType} onValueChange={(value) => setRelationType(value as RelationType)}>
              <SelectTrigger id="relation-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(relationTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!nodeName.trim()}>
              Create & Connect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
