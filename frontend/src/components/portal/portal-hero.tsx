import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAssetUrl } from "@/lib/directus";

export interface PortalHeroStat {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface PortalHeroProps {
  roleLabel: string;
  displayName: string;
  avatar: string | null;
  subtitle?: string;
  stats: PortalHeroStat[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PortalHero({
  roleLabel,
  displayName,
  avatar,
  subtitle,
  stats,
}: PortalHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#2f57ef] via-[#667eea] to-[#b966e7] p-6 text-white shadow-[0_24px_55px_-35px_rgba(47,87,239,0.75)] sm:p-8">
      <div className="pointer-events-none absolute -left-10 -top-14 size-56 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 right-10 size-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.72),rgba(15,23,42,0.25)_52%,rgba(185,102,231,0.38))]" />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-20 border-2 border-white/70 shadow-lg">
            <AvatarImage src={getAssetUrl(avatar)} alt={displayName} />
            <AvatarFallback className="text-lg font-semibold text-slate-900">
              {getInitials(displayName) || "U"}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {roleLabel}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{displayName}</h1>
            <p className="mt-1 text-sm text-white/85">
              {subtitle || "Theo dõi tiến độ và quản lý hoạt động học tập tại đây."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[360px] sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-2xl border border-white/30 bg-white/15 px-3 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-xs text-white/80">
                {item.icon ? <span className="inline-flex">{item.icon}</span> : null}
                <span className="line-clamp-1">{item.label}</span>
              </div>
              <p className="mt-1 text-lg font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
