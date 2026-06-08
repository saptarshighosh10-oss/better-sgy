'use client'

// Hand-illustrated mascots for the four game/show themes, drawn in the same
// flat-shape SVG style as FamilySprite / AllenSprite: <g> groups animated with
// shared keyframes (familyBobAnim for idle bob, mascotGlowPulse for neon glows,
// mascotSwingAnim for arm motion), plus @media (prefers-reduced-motion) overrides.

type MascotProps = { width?: number; height?: number }

const REDUCED_MOTION = `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`

/* ── Cyberpunk: "Nyx", neon street runner ──────────────────────────────────── */
export function CyberpunkMascot({ width = 90, height = 96 }: MascotProps) {
  return (
    <svg
      viewBox="0 0 90 96"
      width={width}
      height={height}
      aria-label="Nyx — neon-visored cyberpunk runner mascot"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .cy-bob   { animation: familyBobAnim 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
          .cy-visor { animation: mascotGlowPulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          .cy-chip  { animation: mascotGlowPulse 2.4s ease-in-out 0.3s infinite; transform-box: fill-box; transform-origin: center; }
          ${REDUCED_MOTION}
        `}</style>
      </defs>

      <g className="cy-bob">
        <ellipse cx="45" cy="93" rx="24" ry="3" fill="black" opacity="0.08"/>

        {/* Legs / boots */}
        <rect x="35" y="71" width="8" height="17" rx="2.5" fill="#1E293B"/>
        <rect x="47" y="71" width="8" height="17" rx="2.5" fill="#1E293B"/>
        <rect x="34" y="84" width="10" height="6" rx="2" fill="#0F172A"/>
        <rect x="46" y="84" width="10" height="6" rx="2" fill="#0F172A"/>
        <rect x="34" y="87.5" width="10" height="1.6" fill="#22D3EE"/>
        <rect x="46" y="87.5" width="10" height="1.6" fill="#22D3EE"/>

        {/* Jacket torso with popped collar (V-neck band hugging the neckline) */}
        <path d="M30 76 C29 60 32 50 45 49 C58 50 61 60 60 76 Z" fill="#1E293B"/>
        <path d="M35 47 Q45 53 55 47 L55 51.5 Q45 57 35 51.5 Z" fill="#0F172A"/>
        <path d="M35 47 Q45 53 55 47" stroke="#22D3EE" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        {/* Chest light */}
        <circle className="cy-chip" cx="45" cy="63" r="2.6" fill="#FACC15"/>

        {/* Arms */}
        <path d="M31 56 C26 60 24 68 26 76" stroke="#1E293B" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <path d="M59 56 C64 60 66 68 64 76" stroke="#1E293B" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <circle cx="26" cy="77" r="5" fill="#0F172A"/>
        <circle cx="64" cy="77" r="5" fill="#0F172A"/>
        <rect x="22.5" y="73" width="7" height="2" rx="1" fill="#22D3EE"/>
        <rect x="60.5" y="73" width="7" height="2" rx="1" fill="#22D3EE"/>

        {/* Head */}
        <circle cx="45" cy="32" r="14" fill="#E8B894"/>
        {/* Mohawk spikes */}
        <path d="M38 22 L36 12 L41 21 Z" fill="#22D3EE"/>
        <path d="M45 20 L45 9 L49 20 Z" fill="#22D3EE"/>
        <path d="M52 22 L54 12 L49 21 Z" fill="#22D3EE"/>
        {/* Visor — glowing */}
        <rect className="cy-visor" x="33" y="29" width="24" height="6.5" rx="3.25" fill="#FACC15"/>
        <rect x="33" y="29" width="24" height="6.5" rx="3.25" fill="none" stroke="#0F172A" strokeWidth="1"/>
        {/* Mouth */}
        <path d="M40 41 Q45 44 50 41" stroke="#9A6B45" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

/* ── Minecraft: "Cube", blocky overworld adventurer ────────────────────────── */
export function MinecraftMascot({ width = 90, height = 96 }: MascotProps) {
  return (
    <svg
      viewBox="0 0 90 96"
      width={width}
      height={height}
      aria-label="Cube — blocky pixel-world adventurer mascot with a pickaxe"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible', imageRendering: 'pixelated' as const }}
    >
      <defs>
        <style>{`
          .mc-bob    { animation: familyBobAnim 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
          .mc-mine   { animation: mascotSwingAnim 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 30px 53px; }
          .mc-blink  { animation: allenBlink 6s ease-in-out 0.8s infinite; transform-box: fill-box; transform-origin: center; }
          ${REDUCED_MOTION}
        `}</style>
      </defs>

      <g className="mc-bob">
        <ellipse cx="45" cy="93" rx="24" ry="3" fill="black" opacity="0.08"/>

        {/* Legs */}
        <rect x="36" y="72" width="7" height="15" fill="#5B3A1E"/>
        <rect x="47" y="72" width="7" height="15" fill="#5B3A1E"/>
        <rect x="35" y="86" width="9" height="5" fill="#374151"/>
        <rect x="46" y="86" width="9" height="5" fill="#374151"/>

        {/* Static (left) arm */}
        <rect x="55" y="51" width="7" height="18" fill="#E0AC83"/>

        {/* Torso (tunic) */}
        <rect x="33" y="50" width="24" height="22" fill="#22A55E"/>
        <rect x="33" y="50" width="24" height="5" fill="#16803C"/>

        {/* Mining (right) arm + pickaxe — held low at the side, swings forward/back */}
        <g className="mc-mine">
          <path d="M30 53 C25 58 22 66 24 75" stroke="#E0AC83" strokeWidth="7" strokeLinecap="round" fill="none"/>
          <rect x="13.5" y="74.5" width="3" height="17" rx="1" fill="#92400E" transform="rotate(30 15 83)"/>
          <rect x="10" y="73" width="10" height="3.5" rx="1" fill="#9CA3AF" transform="rotate(30 15 74.75)"/>
        </g>

        {/* Head */}
        <rect x="32" y="17" width="26" height="24" fill="#E0AC83"/>
        {/* Hair / cap */}
        <rect x="32" y="14" width="26" height="8" fill="#5B3A1E"/>
        <rect x="32" y="20" width="5" height="5" fill="#5B3A1E"/>
        <rect x="53" y="20" width="5" height="5" fill="#5B3A1E"/>
        {/* Eyes */}
        <g className="mc-blink">
          <rect x="37" y="27" width="4" height="4" fill="#1F2937"/>
          <rect x="49" y="27" width="4" height="4" fill="#1F2937"/>
        </g>
        {/* Mouth */}
        <rect x="41" y="35" width="8" height="2" fill="#9A6B45"/>
      </g>
    </svg>
  )
}

/* ── Stranger Things: "Wren", retro flashlight-toting kid ──────────────────── */
export function StrangerThingsMascot({ width = 90, height = 96 }: MascotProps) {
  return (
    <svg
      viewBox="0 0 90 96"
      width={width}
      height={height}
      aria-label="Wren — retro 80s adventurer mascot holding a glowing flashlight"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .st-bob   { animation: familyBobAnim 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
          .st-blink { animation: allenBlink 5.5s ease-in-out 1.4s infinite; transform-box: fill-box; transform-origin: center; }
          .st-beam  { animation: mascotGlowPulse 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 66px 38px; }
          ${REDUCED_MOTION}
        `}</style>
      </defs>

      <g className="st-bob">
        <ellipse cx="45" cy="93" rx="24" ry="3" fill="black" opacity="0.08"/>

        {/* Flashlight beam (drawn behind everything else, glows) */}
        <path className="st-beam" d="M66 38 L88 16 L88 32 Z" fill="#FCA5A5" opacity="0.5"/>

        {/* Legs (denim) */}
        <path d="M39 72 L37 88 L43 88 L44 72 Z" fill="#3B5275"/>
        <path d="M51 72 L52 88 L46 88 L46 72 Z" fill="#3B5275"/>
        <ellipse cx="39" cy="89" rx="5.5" ry="3" fill="#F8FAFC"/>
        <ellipse cx="51" cy="89" rx="5.5" ry="3" fill="#F8FAFC"/>

        {/* Torso — striped tee */}
        <path d="M32 76 C31 61 34 51 45 50 C56 51 59 61 58 76 Z" fill="#FDF6E3"/>
        <path d="M32.4 60 C32 64 31.8 68 32 72 L58 72 C58.2 68 58 64 57.6 60 Z" fill="#F97316" opacity="0.85"/>
        <path d="M32.7 67 L57.3 67 L57.5 71 L32.5 71 Z" fill="#DC2626" opacity="0.8"/>

        {/* Walkie-talkie at hip */}
        <rect x="54" y="69" width="6" height="9" rx="1.4" fill="#374151"/>
        <line x1="57" y1="69" x2="58.5" y2="63" stroke="#374151" strokeWidth="1.4" strokeLinecap="round"/>

        {/* Left arm — resting */}
        <path d="M33 56 C28 61 27 69 30 76" stroke="#FDF6E3" strokeWidth="8.5" strokeLinecap="round" fill="none"/>
        <circle cx="30" cy="77" r="4.6" fill="#F0C8A0"/>

        {/* Right arm — raised, holding flashlight */}
        <path d="M55 57 C61 53 65 47 65 41" stroke="#FDF6E3" strokeWidth="8.5" strokeLinecap="round" fill="none"/>
        <circle cx="65" cy="40" r="4.6" fill="#F0C8A0"/>
        <rect x="62.5" y="34" width="11" height="6" rx="1.6" fill="#6B7280" transform="rotate(-32 68 37)"/>

        {/* Head */}
        <circle cx="45" cy="31" r="14" fill="#F0C8A0"/>
        {/* Hair (bowl cut) */}
        <path d="M31 30 C30 18 38 14 45 14 C52 14 60 18 59 30 C56 23 52 21 45 21 C38 21 34 23 31 30 Z" fill="#5C4630"/>
        {/* Eyes */}
        <g className="st-blink">
          <circle cx="40" cy="32" r="1.7" fill="#3F2D1D"/>
          <circle cx="50" cy="32" r="1.7" fill="#3F2D1D"/>
        </g>
        {/* Mouth */}
        <path d="M41 39 Q45 41.5 49 39" stroke="#B9805A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

/* ── Arcane: "Volt", techy punk inventor ────────────────────────────────────── */
export function ArcaneMascot({ width = 90, height = 96 }: MascotProps) {
  return (
    <svg
      viewBox="0 0 90 96"
      width={width}
      height={height}
      aria-label="Volt — punk-inventor mascot with split pink-and-blue hair and a glowing gauntlet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .ar-bob   { animation: familyBobAnim 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
          .ar-blink { animation: allenBlink 5s ease-in-out 0.6s infinite; transform-box: fill-box; transform-origin: center; }
          .ar-spark { animation: mascotGlowPulse 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          .ar-hair  { animation: mascotHairShiftAnim 4.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center top; }
          ${REDUCED_MOTION}
        `}</style>
      </defs>

      <g className="ar-bob">
        <ellipse cx="45" cy="93" rx="24" ry="3" fill="black" opacity="0.08"/>

        {/* Legs / boots */}
        <rect x="36" y="71" width="8" height="17" rx="2" fill="#1E1B2E"/>
        <rect x="47" y="71" width="8" height="17" rx="2" fill="#1E1B2E"/>
        <rect x="35" y="84.5" width="10" height="5.5" rx="1.6" fill="#0F0D17"/>
        <rect x="46" y="84.5" width="10" height="5.5" rx="1.6" fill="#0F0D17"/>
        <rect x="38" y="86" width="4" height="2.4" rx="1" fill="#F472B6"/>
        <rect x="49" y="86" width="4" height="2.4" rx="1" fill="#22D3EE"/>

        {/* Jacket torso with asymmetric lapel */}
        <path d="M30 76 C29 60 32 50 45 49 C58 50 61 60 60 76 Z" fill="#4C1D95"/>
        <path d="M45 51 L40 76 L37 76 L42 50 Z" fill="#3B1772"/>
        <path d="M45 51 L41 49 L45 56 Z" fill="#F472B6"/>

        {/* Left arm — resting */}
        <path d="M31 56 C26 60 24 68 26 76" stroke="#4C1D95" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <circle cx="26" cy="77" r="5" fill="#3B1772"/>

        {/* Right arm — raised, glowing gauntlet */}
        <path d="M59 56 C64 59 67 64 67 70" stroke="#4C1D95" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <rect x="61.5" y="68" width="11" height="8" rx="2.5" fill="#1E1B2E"/>
        <circle className="ar-spark" cx="67" cy="72" r="3.4" fill="#F472B6"/>
        <circle cx="67" cy="72" r="5.4" fill="none" stroke="#F472B6" strokeWidth="1" opacity="0.4"/>

        {/* Head */}
        <circle cx="45" cy="32" r="14" fill="#E8B894"/>
        {/* Split punk hair */}
        <g className="ar-hair">
          <path d="M31 30 C29 17 36 11 45 13 L45 24 C39 22 33 24 31 30 Z" fill="#3B82F6"/>
          <path d="M59 30 C61 17 54 11 45 13 L45 24 C51 22 57 24 59 30 Z" fill="#EC4899"/>
          <path d="M40 14 L37 6 L42 13 Z" fill="#3B82F6"/>
          <path d="M50 14 L53 6 L48 13 Z" fill="#EC4899"/>
        </g>
        {/* Goggles pushed up on forehead */}
        <line x1="36" y1="21" x2="54" y2="21" stroke="#1E1B2E" strokeWidth="2"/>
        <circle cx="38.5" cy="21" r="3.6" fill="#22D3EE" opacity="0.85"/>
        <circle cx="51.5" cy="21" r="3.6" fill="#22D3EE" opacity="0.85"/>
        <circle cx="38.5" cy="21" r="3.6" fill="none" stroke="#1E1B2E" strokeWidth="1.4"/>
        <circle cx="51.5" cy="21" r="3.6" fill="none" stroke="#1E1B2E" strokeWidth="1.4"/>
        {/* Eyes */}
        <g className="ar-blink">
          <circle cx="40" cy="33" r="1.7" fill="#1E1B2E"/>
          <circle cx="50" cy="33" r="1.7" fill="#1E1B2E"/>
        </g>
        {/* Smirk */}
        <path d="M41 40 Q46 42.5 50 39.5" stroke="#9A6B45" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}
