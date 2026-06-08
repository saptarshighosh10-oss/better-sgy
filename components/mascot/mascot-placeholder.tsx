/*
 * Mascot placeholder — static orange tabby cat, no clothing.
 *
 * Future Rive integration: @rive-app/react-canvas
 * State machine inputs:
 *   idleLevel            number  0=default, 1=pacing (20s), 2=sleeping (45s)
 *   isRefreshing         boolean
 *   hasMissingAssignments boolean
 *   noMissingAssignments boolean
 *   isHovered            boolean
 *   triggerKnock         trigger (random during idle pacing)
 *   triggerGirlfriendVisit trigger (1/10000 chance)
 *
 * Animation states:
 *   idle_default           on load / after any animation ends
 *   idle_pacing            triggered after 20s of idle
 *   idle_knock_glass       random event during pacing
 *   idle_sleep             triggered after 45s total idle
 *   refresh_working        while refresh is in-flight
 *   missing_pointing       when missingCount > 0
 *   no_missing_sitting     when missingCount === 0
 *   hover_nod              on sidebar mascot hover
 *   special_girlfriend_visit 1/10000 chance
 *
 * prefers-reduced-motion: always show this static frame instead of animation.
 */

export function MascotPlaceholder({ size = 60 }: { size?: number }) {
  return (
    <div
      role="img"
      aria-label="Chip — the Better Schoology mascot, an orange tabby cat"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 72"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Tail (behind body, rendered first) */}
        <path
          d="M48 60 Q60 53 58 65 Q56 71 46 67"
          fill="#D4720C"
        />

        {/* Body */}
        <ellipse cx="32" cy="59" rx="18" ry="14" fill="#E8862A" />

        {/* White belly */}
        <ellipse cx="32" cy="61" rx="11" ry="10" fill="#FFECD8" />

        {/* Body tabby stripes */}
        <path d="M17 53 Q23 50 28 53" stroke="#C06010" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M36 53 Q41 50 47 53" stroke="#C06010" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Head */}
        <ellipse cx="32" cy="31" rx="18" ry="17" fill="#E8862A" />

        {/* Left ear */}
        <polygon points="16,19 11,5 24,13" fill="#E8862A" />
        <polygon points="17,18 13,7 23,13" fill="#F9BFAA" />

        {/* Right ear */}
        <polygon points="48,19 53,5 40,13" fill="#E8862A" />
        <polygon points="47,18 51,7 41,13" fill="#F9BFAA" />

        {/* Head tabby forehead stripes */}
        <path d="M25 16 Q29 13 32 14" stroke="#C06010" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M32 13 Q36 11 39 13" stroke="#C06010" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M28 11 Q32 9 36 11"  stroke="#C06010" strokeWidth="1.1" fill="none" strokeLinecap="round" />

        {/* White muzzle area */}
        <ellipse cx="32" cy="37" rx="10.5" ry="8.5" fill="#FFECD8" />

        {/* Left eye */}
        <ellipse cx="25.5" cy="29" rx="4.5" ry="5" fill="#4A9E70" />
        <ellipse cx="25.5" cy="29" rx="2.5" ry="3.2" fill="#1A1206" />
        <circle  cx="26.5" cy="27.5" r="1" fill="white" />

        {/* Right eye */}
        <ellipse cx="38.5" cy="29" rx="4.5" ry="5" fill="#4A9E70" />
        <ellipse cx="38.5" cy="29" rx="2.5" ry="3.2" fill="#1A1206" />
        <circle  cx="39.5" cy="27.5" r="1" fill="white" />

        {/* Nose */}
        <ellipse cx="32" cy="36.5" rx="2.5" ry="2" fill="#E07878" />

        {/* Mouth */}
        <path
          d="M29.5 38.5 Q32 41 34.5 38.5"
          stroke="#C05858"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />

        {/* Whiskers — left */}
        <line x1="21.5" y1="36" x2="6"  y2="33" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />
        <line x1="21.5" y1="38" x2="6"  y2="38" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />
        <line x1="21.5" y1="40" x2="6"  y2="43" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />

        {/* Whiskers — right */}
        <line x1="42.5" y1="36" x2="58" y2="33" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />
        <line x1="42.5" y1="38" x2="58" y2="38" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />
        <line x1="42.5" y1="40" x2="58" y2="43" stroke="#C89860" strokeWidth="0.9" opacity="0.65" />

        {/* Front paws */}
        <ellipse cx="24" cy="70.5" rx="7"   ry="4.5" fill="#E8862A" />
        <ellipse cx="40" cy="70.5" rx="7"   ry="4.5" fill="#E8862A" />

        {/* Paw toe lines */}
        <path d="M21 70 Q24 72 27 70" stroke="#C06010" strokeWidth="0.8" fill="none" />
        <path d="M37 70 Q40 72 43 70" stroke="#C06010" strokeWidth="0.8" fill="none" />
      </svg>
    </div>
  )
}
