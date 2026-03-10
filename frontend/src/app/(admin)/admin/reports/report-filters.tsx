"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReportFiltersProps {
  from: string;
  to: string;
}

export function ReportFilters({ from, to }: ReportFiltersProps) {
  const router = useRouter();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (fromValue) params.set("from", fromValue);
    if (toValue) params.set("to", toValue);
    const qs = params.toString();
    router.push(`/admin/reports${qs ? `?${qs}` : ""}`);
  };

  const handleClear = () => {
    setFromValue("");
    setToValue("");
    router.push("/admin/reports");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Từ ngày</span>
        <Input
          type="date"
          value={fromValue}
          onChange={(e) => setFromValue(e.target.value)}
          className="h-8 w-40 border-gray-300 text-sm text-gray-700"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Đến ngày</span>
        <Input
          type="date"
          value={toValue}
          onChange={(e) => setToValue(e.target.value)}
          className="h-8 w-40 border-gray-300 text-sm text-gray-700"
        />
      </div>
      <Button
        size="sm"
        onClick={handleFilter}
        className="bg-gray-900 text-white hover:bg-gray-800"
      >
        Lọc
      </Button>
      {(from || to) && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
          className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="mr-1 h-3 w-3" />
          Xoá bộ lọc
        </Button>
      )}
    </div>
  );
}
