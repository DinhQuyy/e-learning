import { cn } from "@/lib/utils";

export function KognifyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kognify-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2f57ef" />
          <stop offset="100%" stopColor="#b966e7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#kognify-icon-grad)" />
      <path
        d="M9 8 L9 24 M9 16 L20 8 M14 13.5 L21 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface KognifyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function KognifyLogo({ className, size = "md" }: KognifyLogoProps) {
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span
      className={cn("bg-clip-text font-extrabold tracking-tight text-transparent", textSize, className)}
      style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
    >
      Kognify
    </span>
  );
}
