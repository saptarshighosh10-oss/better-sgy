'use client'

// Allen the Alien — standalone mascot, extracted and expanded from the
// FamilySprite "family photo" lineup. Same orange cyclops design, but here
// he gets his own spotlight: an idle bob, a slow blink, and a friendly wave.

export function AllenSprite({ width = 90, height = 92 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="214 4 90 94"
      width={width}
      height={height}
      aria-label="Allen — friendly one-eyed orange alien mascot, waving"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .allen-solo-bob {
            animation: familyBobAnim 3.1s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center bottom;
          }
          .allen-solo-blink {
            animation: allenBlink 5s ease-in-out 1.1s infinite;
            transform-box: fill-box;
            transform-origin: center center;
          }
          .allen-solo-wave {
            animation: allenWaveAnim 2.6s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: bottom right;
          }
          @media (prefers-reduced-motion: reduce) {
            .allen-solo-bob, .allen-solo-blink, .allen-solo-wave { animation: none; }
          }
        `}</style>
      </defs>

      <g className="allen-solo-bob">
        {/* Ground shadow */}
        <ellipse cx="258" cy="93" rx="26" ry="3.5" fill="black" opacity="0.08"/>

        {/* Large orange body/torso */}
        <ellipse cx="258" cy="64" rx="23" ry="20" fill="#FB923C"/>
        {/* Gray shorts */}
        <rect x="241" y="69" width="34" height="15" rx="8" fill="#374151"/>

        {/* Large rounded orange head — no hair */}
        <ellipse cx="258" cy="30" rx="22" ry="22" fill="#FB923C"/>

        {/* Single giant eye — Allen's signature feature */}
        <g className="allen-solo-blink">
          <ellipse cx="258" cy="29" rx="15" ry="15" fill="white"/>
          <circle cx="258" cy="29" r="10" fill="#2563EB"/>
          <circle cx="259" cy="29.5" r="6" fill="#111"/>
          <circle cx="262" cy="24" r="2.5" fill="white"/>
          <circle cx="254" cy="23" r="1.2" fill="white" opacity="0.6"/>
        </g>
        <ellipse cx="258" cy="29" rx="15" ry="15" fill="none" stroke="#EA580C" strokeWidth="2"/>

        {/* Big friendly grin */}
        <path d="M243 49 Q258 61 273 49" stroke="#EA580C" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

        {/* Left arm — relaxed, resting */}
        <path d="M237 61 C230 65 225 74 227 81" stroke="#FB923C" strokeWidth="13" strokeLinecap="round" fill="none"/>
        <circle cx="226" cy="82" r="9" fill="#FB923C"/>

        {/* Right arm — raised in a wave */}
        <g className="allen-solo-wave">
          <path d="M278 60 C286 53 291 44 289 36" stroke="#FB923C" strokeWidth="13" strokeLinecap="round" fill="none"/>
          <circle cx="289" cy="35" r="9" fill="#FB923C"/>
        </g>

        {/* Feet */}
        <ellipse cx="249" cy="86" rx="10" ry="5.5" fill="#EA580C"/>
        <ellipse cx="267" cy="86" rx="10" ry="5.5" fill="#EA580C"/>
      </g>
    </svg>
  )
}
