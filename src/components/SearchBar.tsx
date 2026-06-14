import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { labelForSearchContext } from "@/lib/search";
import type { Mode, SearchContext, SearchScope, TreeFilter } from "@/lib/types";

interface SearchBarProps {
  open: boolean;
  context: SearchContext;
  mode: Mode;
  query: string;
  treeFilter: TreeFilter;
  searchScope: SearchScope;
  includeSource: boolean;
  searching: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSearchAllFiles: () => void;
  onCancel: () => void;
  onClear: () => void;
  onFilterChange: (filter: TreeFilter) => void;
  onScopeChange: (scope: SearchScope) => void;
  onIncludeSourceChange: (value: boolean) => void;
}

export function SearchBar({
  open,
  context,
  mode,
  query,
  treeFilter,
  searchScope,
  includeSource,
  searching,
  onQueryChange,
  onSearch,
  onSearchAllFiles,
  onCancel,
  onClear,
  onFilterChange,
  onScopeChange,
  onIncludeSourceChange,
}: SearchBarProps) {
  if (!open) return null;

  const filesContext = context === "files";
  const placeholder = filesContext ? "Search paths, text, constants" : "Find in current diff";

  return (
    <div className="search-bar" data-context={context}>
      <span className="search-context-label">{labelForSearchContext(context)}</span>
      <Input
        className="search-input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
      />
      {filesContext ? (
        <>
          <Select
            value={searchScope}
            disabled={mode === "single"}
            onValueChange={(v) => onScopeChange(v as SearchScope)}
          >
            <SelectTrigger aria-label="Search scope"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="both">Both sides</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <label className="check-label search-inline-check">
            <Checkbox
              aria-label="Include source search"
              checked={includeSource}
              onCheckedChange={(checked) => onIncludeSourceChange(checked === true)}
            />
            Source
          </label>
          <Select value={treeFilter} onValueChange={(v) => onFilterChange(v as TreeFilter)}>
            <SelectTrigger aria-label="Tree filter"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">Show all</SelectItem>
              <SelectItem value="diff">Differences</SelectItem>
              <SelectItem value="same">Identical</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <Button aria-label="Search all" disabled={searching} onClick={onSearch}><Search /> Search all</Button>
        </>
      ) : (
        <>
          <Button aria-label="Find" disabled={searching} onClick={onSearch}><Search /> Find</Button>
          <Button variant="outline" onClick={onSearchAllFiles}>Search all files</Button>
        </>
      )}
      <Button variant="outline" disabled={!searching} onClick={onCancel}>Cancel search</Button>
      <Button variant="ghost" aria-label="Clear search" onClick={onClear}><X /> Clear</Button>
    </div>
  );
}
