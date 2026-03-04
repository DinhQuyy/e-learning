"use client";

import { PortalSideNav } from "@/components/portal/portal-side-nav";
import { studentPortalNavItems } from "@/components/portal/portal-nav-config";

export function StudentSidebar() {
  return (
    <PortalSideNav greeting="Xin chào học viên" items={studentPortalNavItems} />
  );
}
