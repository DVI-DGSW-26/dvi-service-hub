/** 인사 카드 오른쪽의 유리 건물 그림. 장식이라 보조기기에서는 숨긴다. */
export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 180" preserveAspectRatio="xMaxYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb6ff" />
          <stop offset="1" stopColor="#dbe8ff" />
        </linearGradient>
        <linearGradient id="hero-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d93f2" />
          <stop offset=".55" stopColor="#3f6bd8" />
          <stop offset="1" stopColor="#2a4fa6" />
        </linearGradient>
        <linearGradient id="hero-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3d5fb" />
          <stop offset="1" stopColor="#8ea9e6" />
        </linearGradient>
        <linearGradient id="hero-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".6" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id="hero-panes-front" width="18" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0H18M0 0V14" stroke="#eef3ff" strokeOpacity=".6" strokeWidth="1.2" />
        </pattern>
        <pattern id="hero-panes-side" width="13" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0H13M0 0V14" stroke="#ffffff" strokeOpacity=".7" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="420" height="180" fill="url(#hero-sky)" />

      {/* 구름 — 어두운 테마에서는 회색 원판처럼 보여 숨긴다 */}
      <g fill="#fff" className="dark:hidden">
        <ellipse cx="90" cy="40" rx="40" ry="12" opacity=".9" />
        <ellipse cx="118" cy="33" rx="24" ry="13" opacity=".9" />
        <ellipse cx="175" cy="70" rx="30" ry="8" opacity=".7" />
        <ellipse cx="330" cy="20" rx="30" ry="8" opacity=".6" />
      </g>

      {/* 건물: 옆면 → 앞면 → 창틀 → 반사광 */}
      <polygon points="210,62 262,30 262,180 210,180" fill="url(#hero-side)" />
      <polygon points="210,62 262,30 262,180 210,180" fill="url(#hero-panes-side)" />
      <polygon points="262,30 420,8 420,180 262,180" fill="url(#hero-front)" />
      <polygon points="262,30 420,8 420,180 262,180" fill="url(#hero-panes-front)" />
      <polygon points="262,30 420,8 420,90 262,140" fill="url(#hero-shine)" />
      <polygon points="208,60 262,27 422,5 422,10 262,33 210,65" fill="#f2f6ff" />

      {/* 나무 */}
      <g>
        <circle cx="196" cy="166" r="18" fill="#7cb662" />
        <circle cx="178" cy="172" r="13" fill="#93cb76" />
        <circle cx="214" cy="172" r="12" fill="#68a453" />
        <circle cx="244" cy="174" r="10" fill="#93cb76" />
        <circle cx="160" cy="176" r="9" fill="#68a453" />
      </g>
    </svg>
  )
}
