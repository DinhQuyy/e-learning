import { Poppins } from "next/font/google";
import { Header } from "@/components/layout/header";
import { PortalHero, type PortalHeroStat } from "@/components/portal/portal-hero";
import { PortalSideNav } from "@/components/portal/portal-side-nav";
import type { PortalNavItem } from "@/components/portal/portal-nav-config";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

interface PortalShellProps {
  roleLabel: string;
  displayName: string;
  avatar: string | null;
  subtitle?: string;
  greeting: string;
  stats: PortalHeroStat[];
  navItems: PortalNavItem[];
  children: React.ReactNode;
}

export function PortalShell({
  roleLabel,
  displayName,
  avatar,
  subtitle,
  greeting,
  stats,
  navItems,
  children,
}: PortalShellProps) {
  return (
    <div className={`${poppins.className} learnify-home learnify-portal min-h-screen bg-[#f6f8fc]`}>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <PortalHero
          roleLabel={roleLabel}
          displayName={displayName}
          avatar={avatar}
          subtitle={subtitle}
          stats={stats}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <PortalSideNav greeting={greeting} items={navItems} />
          <div className="space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
