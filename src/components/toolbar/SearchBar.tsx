import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useDebounce } from '@/hooks/use-debounce';
import { useEffect } from 'react';

export default function SearchBar() {
  const { searchQuery, setSearchQuery, searchNodes, fetchGraph } = useGraphStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 500);

  useEffect(() => {
    if (debouncedQuery) {
      searchNodes(debouncedQuery);
    } else {
      fetchGraph();
    }
  }, [debouncedQuery, searchNodes, fetchGraph]);

  const handleChange = (value: string) => {
    setLocalQuery(value);
    setSearchQuery(value);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search nodes..."
        value={localQuery}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-10 bg-card border-border"
      />
    </div>
  );
}
