// Simple classname joiner — no external dep needed
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark";
  className?: string;
}

const sizes = {
  sm:  { icon: 28,  name: 16, gap: 8  },
  md:  { icon: 38,  name: 22, gap: 10 },
  lg:  { icon: 50,  name: 28, gap: 12 },
  xl:  { icon: 64,  name: 36, gap: 16 },
};

export function Logo({
  variant = "full",
  size    = "md",
  theme   = "light",
  className,
}: LogoProps) {
  const s           = sizes[size];
  const isDark      = theme === "dark";
  const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
  const uid         = "lv3-admin";

  return (
    <div
      className={cn("inline-flex items-center shrink-0 select-none", className)}
      style={{ gap: s.gap }}
    >
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g1`} x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#004643" />
            <stop offset="50%"  stopColor="#006661" />
            <stop offset="100%" stopColor="#008a85" />
          </linearGradient>
          <filter id={`${uid}-shadow`} x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4F46E5" floodOpacity="0.28" />
          </filter>
          <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <rect width="48" height="48" rx="13" fill={`url(#${uid}-g1)`} filter={`url(#${uid}-shadow)`} />

        {/* Left page */}
        <path d="M10 14 C10 13 11 12 12 12 L22 13.5 L22 34 L12 32.5 C11 32.3 10 31.3 10 30.3 Z" fill="white" opacity="0.92" />
        {/* Right page */}
        <path d="M26 13.5 L36 12 C37 12 38 13 38 14 L38 30.3 C38 31.3 37 32.3 36 32.5 L26 34 Z" fill="white" opacity="0.75" />
        {/* Spine */}
        <line x1="24" y1="13" x2="24" y2="34" stroke={`url(#${uid}-g1)`} strokeWidth="1.5" strokeLinecap="round" />

        {/* Arrow */}
        <g filter={`url(#${uid}-glow)`}>
          <polyline points="18,20 24,13 30,20" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="24" y1="13" x2="24" y2="8" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        </g>

        {/* Page lines */}
        <line x1="13" y1="19" x2="20" y2="19.4" stroke={`url(#${uid}-g1)`} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <line x1="13" y1="22.5" x2="20" y2="22.9" stroke={`url(#${uid}-g1)`} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        <line x1="13" y1="26" x2="18" y2="26.3" stroke={`url(#${uid}-g1)`} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      </svg>

      {variant === "full" && (
        <span
          style={{
            fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: s.name,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ color: textPrimary }}>Learnov</span>
          <span
            style={{
              background: "linear-gradient(120deg, #004643 0%, #006661 55%, #008a85 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ora
          </span>
        </span>
      )}
    </div>
  );
}
