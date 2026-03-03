"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintCertificateButton() {
  return (
    <Button
      variant="outline"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 size-4" />
      In chứng chỉ
    </Button>
  );
}

