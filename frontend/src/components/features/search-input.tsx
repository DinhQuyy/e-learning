"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  paramKey?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  placeholder = "Tim kiem khoa hoc...",
  className,
  paramKey = "search",
  autoFocus = false,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialValue = searchParams.get(paramKey) || "";
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const updateSearchParams = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue.trim()) {
        params.set(paramKey, newValue.trim());
      } else {
        params.delete(paramKey);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `?${query}` : "?");
    },
    [router, searchParams, paramKey]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    isTypingRef.current = true;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      updateSearchParams(newValue);
    }, 300);
  };

  const handleClear = () => {
    setValue("");
    isTypingRef.current = false;
    updateSearchParams("");
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Sync value from URL when searchParams change externally
  useEffect(() => {
    if (!isTypingRef.current) {
      const paramValue = searchParams.get(paramKey) || "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(paramValue);
    }
  }, [searchParams, paramKey]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Xoa tim kiem"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
