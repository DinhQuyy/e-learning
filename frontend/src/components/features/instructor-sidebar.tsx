"use client";

import { PortalSideNav } from "@/components/portal/portal-side-nav";
import { instructorPortalNavItems } from "@/components/portal/portal-nav-config";

export function InstructorSidebar() {
  return (
    <PortalSideNav greeting="Không gian giảng viên" items={instructorPortalNavItems} />
  );
}
