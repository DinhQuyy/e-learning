"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintCertificateButton() {
  return (
    <Button
      variant="outline"
      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 size-4" />
      In chứng chỉ
    </Button>
  );
}
