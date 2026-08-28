"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useInfiniteFightersList, FighterBasic } from "@/hooks/compare/useCompareFighters";

export function FighterSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select Fighter...",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Custom simple debounce
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteFightersList(debouncedSearch);

  const fighters = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.fighters) || [];
  }, [data]);

  const selectedFighter = React.useMemo(() => {
    return fighters.find((fighter) => fighter.id === value);
  }, [value, fighters]);

  // Infinite scroll intersection observer
  const observerTarget = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full h-14 justify-between text-lg font-medium bg-card hover:bg-muted/50 border-border/50"
        >
          {selectedFighter ? (
            <span className="truncate">
              {selectedFighter.name} {selectedFighter.weight_class ? `(${selectedFighter.weight_class})` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search fighters by name..."
            value={search}
            onValueChange={setSearch}
            className="text-base"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {fighters.length === 0 && !isFetching && (
              <CommandEmpty>No fighters found.</CommandEmpty>
            )}
            <CommandGroup>
              {fighters.map((fighter) => (
                <CommandItem
                  key={fighter.id}
                  value={fighter.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer py-3"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === fighter.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-base">{fighter.name}</span>
                    {fighter.record && (
                      <span className="text-xs text-muted-foreground">
                        {fighter.weight_class} • {fighter.record}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {/* Loading indicator & intersection target */}
            <div ref={observerTarget} className="p-4 flex justify-center">
              {(isFetchingNextPage || (isFetching && fighters.length === 0)) && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
