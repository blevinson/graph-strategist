import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RelationType, relationTypeConfig } from '@/types/graph';

interface EdgeConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (relationType: RelationType) => void;
}

export default function EdgeConnectionDialog({
  isOpen,
  onClose,
  onConfirm,
}: EdgeConnectionDialogProps) {
  const [selectedType, setSelectedType] = useState<RelationType>('depends_on');

  const handleConfirm = () => {
    onConfirm(selectedType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
          <DialogDescription>
            Select the type of relationship between these nodes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="relation-type">Relationship Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as RelationType)}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {Object.entries(relationTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
