'use client'

// Family lineup sprite — 4 original superhero-inspired characters
// doing a "family photo" idle animation.
// Based on sprite animation notes: inspired by fast physical hero,
// energy-control hero, and two additional original characters.

export function FamilySprite({ width = 290, height = 90 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 290 90"
      width={width}
      height={height}
      aria-label="Hero crew posing for a family photo"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .fam-bob-1 {
            animation: familyBobAnim 3.0s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center bottom;
          }
          .fam-bob-2 {
            animation: familyBobAnim 2.7s ease-in-out 0.55s infinite;
            transform-box: fill-box;
            transform-origin: center bottom;
          }
          .fam-bob-3 {
            animation: familyBobAnim 5.0s ease-in-out 1.1s infinite;
            transform-box: fill-box;
            transform-origin: center bottom;
          }
          .fam-bob-4 {
            animation: familyBobAnim 2.5s ease-in-out 1.7s infinite;
            transform-box: fill-box;
            transform-origin: center bottom;
          }
          .fam-allen-blink {
            animation: allenBlink 5.5s ease-in-out 2s infinite;
            transform-box: fill-box;
            transform-origin: center center;
          }
          .fam-flash {
            animation: cameraFlashAnim 8s ease-out 1.5s infinite;
            pointer-events: none;
          }
          .fam-eve-glow {
            animation: eveGlowAnim 3.5s ease-in-out infinite;
          }
          .fam-cape {
            animation: capeSway 2.8s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: top center;
          }
          @media (prefers-reduced-motion: reduce) {
            .fam-bob-1,.fam-bob-2,.fam-bob-3,.fam-bob-4,
            .fam-allen-blink,.fam-flash,.fam-eve-glow,.fam-cape {
              animation: none;
            }
          }
        `}</style>

        {/* Pink glow filter for Eve */}
        <radialGradient id="eveHandGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F9A8D4" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#F9A8D4" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* ── Camera flash white overlay ───────────────────────────────────────── */}
      <rect x="0" y="0" width="290" height="90" fill="white" opacity="0" rx="8" className="fam-flash"/>

      {/* ════════════════════════════════════════════════════════════════════════
          CHARACTER 1 — Atom Eve-inspired: energy-control hero
          Key features: long pink hair, pink domino mask, pink suit, hovering
          Center x=38, floating (feet at y=80 instead of 86)
      ════════════════════════════════════════════════════════════════════════ */}
      <g className="fam-bob-1">
        {/* Long pink hair strands — behind head */}
        <path d="M30 19 C25 28 22 50 24 68 C25 74 30 77 33 75" fill="#F472B6"/>
        <path d="M46 19 C51 28 54 50 52 68 C51 74 46 77 43 75" fill="#F472B6"/>

        {/* Head */}
        <ellipse cx="38" cy="23" rx="10" ry="11" fill="#FDDCB8"/>

        {/* Top hair arching over head */}
        <path d="M29 20 C31 11 45 11 47 20" fill="#F472B6"/>
        {/* Side hair pieces framing face */}
        <path d="M29 20 C27 26 27 38 29 44" fill="#F472B6"/>
        <path d="M47 20 C49 26 49 38 47 44" fill="#F472B6"/>

        {/* Pink domino mask */}
        <rect x="29" y="19" width="18" height="7" rx="3.5" fill="#DB2777"/>
        {/* Eye whites inside mask */}
        <circle cx="34" cy="22" r="3" fill="white" opacity="0.9"/>
        <circle cx="42" cy="22" r="3" fill="white" opacity="0.9"/>
        {/* Pupils */}
        <circle cx="34.5" cy="22.5" r="1.7" fill="#1F2937"/>
        <circle cx="42.5" cy="22.5" r="1.7" fill="#1F2937"/>
        {/* Eye shines */}
        <circle cx="35.2" cy="21.8" r="0.7" fill="white"/>
        <circle cx="43.2" cy="21.8" r="0.7" fill="white"/>

        {/* Smile */}
        <path d="M33 31 Q38 35 43 31" stroke="#C07060" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

        {/* Pink torso */}
        <rect x="30" y="34" width="16" height="24" rx="7" fill="#EC4899"/>
        {/* White center section */}
        <rect x="33" y="39" width="10" height="13" rx="4" fill="white" opacity="0.82"/>
        {/* Atom-like symbol (simplified) */}
        <circle cx="38" cy="46" r="3.5" fill="none" stroke="#EC4899" strokeWidth="0.8"/>
        <ellipse cx="38" cy="46" rx="6" ry="2" fill="none" stroke="#EC4899" strokeWidth="0.5"
          transform="rotate(-45 38 46)"/>
        <ellipse cx="38" cy="46" rx="6" ry="2" fill="none" stroke="#EC4899" strokeWidth="0.5"
          transform="rotate(45 38 46)"/>

        {/* Arms */}
        <path d="M30 38 C24 43 23 54 25 59" stroke="#EC4899" strokeWidth="7" strokeLinecap="round" fill="none"/>
        <path d="M46 38 C52 43 53 54 51 59" stroke="#EC4899" strokeWidth="7" strokeLinecap="round" fill="none"/>
        {/* Hand glow */}
        <circle cx="24" cy="60" r="7" fill="url(#eveHandGrad)" className="fam-eve-glow"/>
        <circle cx="52" cy="60" r="7" fill="url(#eveHandGrad)" className="fam-eve-glow"/>

        {/* Legs — pink tights */}
        <rect x="32" y="58" width="5" height="16" rx="2.5" fill="#FBCFE8"/>
        <rect x="39" y="58" width="5" height="16" rx="2.5" fill="#FBCFE8"/>
        {/* Boots */}
        <ellipse cx="34" cy="76" rx="6" ry="4" fill="#EC4899"/>
        <ellipse cx="42" cy="76" rx="6" ry="4" fill="#EC4899"/>
      </g>

      {/* ════════════════════════════════════════════════════════════════════════
          CHARACTER 2 — Invincible-inspired: fast physical hero, teen
          Key features: messy spiky black hair, yellow goggles,
                        yellow chest/shoulders, blue legs, black arms
          Center x=108, standing (feet at y=86)
      ════════════════════════════════════════════════════════════════════════ */}
      <g className="fam-bob-2">
        {/* Messy black hair — spiky, sticks up */}
        <path d="M97 26 C97 15 101 10 108 9 C115 10 119 15 119 26" fill="#1F2937"/>
        <path d="M99 25 C97 17 101 12 103 19" fill="#1F2937"/>
        <path d="M104 23 C103 15 107 10 108 16" fill="#1F2937"/>
        <path d="M112 23 C113 15 117 12 115 19" fill="#1F2937"/>

        {/* Face */}
        <ellipse cx="108" cy="30" rx="11" ry="12" fill="#FDDCB8"/>

        {/* Yellow goggles — defining feature */}
        <ellipse cx="102" cy="29" rx="5" ry="4.5" fill="#EAB308"/>
        <ellipse cx="114" cy="29" rx="5" ry="4.5" fill="#EAB308"/>
        {/* Goggle lenses */}
        <ellipse cx="102" cy="29" rx="3.5" ry="3" fill="#FEF9C3" opacity="0.9"/>
        <ellipse cx="114" cy="29" rx="3.5" ry="3" fill="#FEF9C3" opacity="0.9"/>
        {/* Goggle bridge */}
        <rect x="107" y="27" width="2" height="4" rx="1" fill="#CA8A04"/>
        {/* Goggle borders */}
        <ellipse cx="102" cy="29" rx="5" ry="4.5" fill="none" stroke="#1F2937" strokeWidth="1.5"/>
        <ellipse cx="114" cy="29" rx="5" ry="4.5" fill="none" stroke="#1F2937" strokeWidth="1.5"/>
        {/* Pupils */}
        <circle cx="102" cy="29" r="1.8" fill="#1F2937"/>
        <circle cx="114" cy="29" r="1.8" fill="#1F2937"/>

        {/* Slight awkward smile — still figuring this out */}
        <path d="M104 39 Q108 44 112 39" stroke="#C07060" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

        {/* Dark suit base */}
        <rect x="98" y="42" width="20" height="26" rx="7" fill="#1F2937"/>
        {/* Yellow chest/shoulder area */}
        <path d="M98 42 Q108 44 118 42 L118 52 Q108 54 98 52 Z" fill="#EAB308"/>
        {/* Black "I" emblem on yellow chest */}
        <rect x="106" y="44" width="4" height="7" rx="1.5" fill="#1F2937"/>

        {/* Dark arms */}
        <path d="M98 47 C91 52 89 63 91 69" stroke="#1F2937" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <path d="M118 47 C125 52 127 63 125 69" stroke="#1F2937" strokeWidth="9" strokeLinecap="round" fill="none"/>
        {/* Yellow gloves */}
        <ellipse cx="90" cy="71" rx="7" ry="5" fill="#EAB308"/>
        <ellipse cx="126" cy="71" rx="7" ry="5" fill="#EAB308"/>

        {/* Blue legs */}
        <rect x="100" y="68" width="7" height="18" rx="3.5" fill="#1D4ED8"/>
        <rect x="109" y="68" width="7" height="18" rx="3.5" fill="#1D4ED8"/>
        {/* Yellow boots */}
        <ellipse cx="103" cy="87" rx="8" ry="4.5" fill="#EAB308"/>
        <ellipse cx="113" cy="87" rx="8" ry="4.5" fill="#EAB308"/>
      </g>

      {/* ════════════════════════════════════════════════════════════════════════
          CHARACTER 3 — Omni-Man-inspired: powerful veteran hero
          Key features: thick black mustache, red cape, white/gray suit,
                        bigger/taller than others, perfectly rigid posture
          Center x=190, tallest (head at y=12, feet at y=86)
      ════════════════════════════════════════════════════════════════════════ */}
      <g className="fam-bob-3">
        {/* Red cape — behind body */}
        <g className="fam-cape">
          <path d="M177 46 C168 60 167 77 169 85 C170 87 175 88 177 86" fill="#DC2626"/>
          <path d="M203 46 C212 60 213 77 211 85 C210 87 205 88 203 86" fill="#DC2626"/>
          <path d="M177 46 Q190 48 203 46" fill="#DC2626"/>
        </g>

        {/* Short black hair — neat, not spiky */}
        <path d="M177 17 C177 8 182 4 190 3 C198 4 203 8 203 17" fill="#1F2937"/>
        <path d="M177 17 C176 22 176 26 178 28" fill="#1F2937"/>
        <path d="M203 17 C204 22 204 26 202 28" fill="#1F2937"/>

        {/* Face — stronger/wider jaw for adult */}
        <ellipse cx="190" cy="22" rx="14" ry="15" fill="#FDDCB8"/>

        {/* Strong brow / eyebrows */}
        <rect x="182" y="13" width="8" height="3" rx="1.5" fill="#1F2937"/>
        <rect x="192" y="13" width="8" height="3" rx="1.5" fill="#1F2937"/>

        {/* Eyes — no mask, stern expression */}
        <ellipse cx="185" cy="21" rx="4" ry="3.5" fill="white"/>
        <ellipse cx="195" cy="21" rx="4" ry="3.5" fill="white"/>
        <circle cx="185" cy="21.5" r="2.5" fill="#1E3A8A"/>
        <circle cx="195" cy="21.5" r="2.5" fill="#1E3A8A"/>
        <circle cx="185" cy="21.5" r="1.2" fill="#111"/>
        <circle cx="195" cy="21.5" r="1.2" fill="#111"/>
        <circle cx="186.3" cy="20.4" r="0.6" fill="white"/>
        <circle cx="196.3" cy="20.4" r="0.6" fill="white"/>

        {/* THICK BLACK MUSTACHE — most distinctive feature */}
        <path
          d="M179 31 C178 30 178 33 181 34 C185 36 188 35 190 34
             C192 35 195 36 199 34 C202 33 202 30 201 31
             Q190 38 179 31 Z"
          fill="#1F2937"
        />

        {/* Stern straight mouth below mustache */}
        <path d="M184 37 L196 37" stroke="#B07060" strokeWidth="1" strokeLinecap="round"/>

        {/* White/gray suit body */}
        <rect x="177" y="44" width="26" height="30" rx="7" fill="#F3F4F6"/>
        {/* Red chest area */}
        <path d="M179 44 Q190 46 201 44 L201 53 Q190 55 179 53 Z" fill="#DC2626"/>

        {/* Arms — thick, white/gray */}
        <path d="M177 50 C169 56 167 67 169 73" stroke="#F3F4F6" strokeWidth="11" strokeLinecap="round" fill="none"/>
        <path d="M203 50 C211 56 213 67 211 73" stroke="#F3F4F6" strokeWidth="11" strokeLinecap="round" fill="none"/>
        {/* Red gloves */}
        <ellipse cx="168" cy="75" rx="9" ry="6" fill="#DC2626"/>
        <ellipse cx="212" cy="75" rx="9" ry="6" fill="#DC2626"/>

        {/* Legs — white/gray */}
        <rect x="180" y="74" width="9" height="12" rx="4" fill="#F3F4F6"/>
        <rect x="191" y="74" width="9" height="12" rx="4" fill="#F3F4F6"/>
        {/* Red boots */}
        <ellipse cx="184" cy="87" rx="9" ry="5" fill="#DC2626"/>
        <ellipse cx="196" cy="87" rx="9" ry="5" fill="#DC2626"/>
      </g>

      {/* ════════════════════════════════════════════════════════════════════════
          CHARACTER 4 — Allen the Alien-inspired: orange alien, one eye
          Key features: orange skin, single large centered eye (cyclops),
                        bulky rounded body, big arms, bald
          Center x=258, shorter+wider, feet at y=86
      ════════════════════════════════════════════════════════════════════════ */}
      <g className="fam-bob-4">
        {/* Large orange body/torso */}
        <ellipse cx="258" cy="64" rx="23" ry="20" fill="#FB923C"/>
        {/* Gray shorts */}
        <rect x="241" y="69" width="34" height="15" rx="8" fill="#374151"/>

        {/* Large rounded orange head — no hair */}
        <ellipse cx="258" cy="30" rx="22" ry="22" fill="#FB923C"/>

        {/* Single giant eye — the unmistakable Allen feature */}
        <g className="fam-allen-blink">
          {/* Eye socket white */}
          <ellipse cx="258" cy="29" rx="15" ry="15" fill="white"/>
          {/* Iris */}
          <circle cx="258" cy="29" r="10" fill="#2563EB"/>
          {/* Pupil */}
          <circle cx="259" cy="29.5" r="6" fill="#111"/>
          {/* Eye shines */}
          <circle cx="262" cy="24" r="2.5" fill="white"/>
          <circle cx="254" cy="23" r="1.2" fill="white" opacity="0.6"/>
        </g>
        {/* Eyelid border */}
        <ellipse cx="258" cy="29" rx="15" ry="15" fill="none" stroke="#EA580C" strokeWidth="2"/>

        {/* Wide friendly mouth — family photo smile */}
        <path d="M244 50 Q258 60 272 50" stroke="#EA580C" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

        {/* Thick orange arms */}
        <path d="M236 62 C229 65 224 74 226 81" stroke="#FB923C" strokeWidth="13" strokeLinecap="round" fill="none"/>
        <path d="M280 62 C287 65 292 74 290 81" stroke="#FB923C" strokeWidth="13" strokeLinecap="round" fill="none"/>
        {/* Hands */}
        <circle cx="225" cy="82" r="9" fill="#FB923C"/>
        <circle cx="291" cy="82" r="9" fill="#FB923C"/>

        {/* Feet/boots */}
        <ellipse cx="249" cy="86" rx="10" ry="5.5" fill="#EA580C"/>
        <ellipse cx="267" cy="86" rx="10" ry="5.5" fill="#EA580C"/>
      </g>

      {/* ── Ground shadows ─────────────────────────────────────────────────────── */}
      <ellipse cx="38"  cy="88" rx="18" ry="3" fill="black" opacity="0.08"/>
      <ellipse cx="108" cy="89" rx="22" ry="3" fill="black" opacity="0.08"/>
      <ellipse cx="190" cy="89" rx="26" ry="3" fill="black" opacity="0.08"/>
      <ellipse cx="258" cy="89" rx="28" ry="3" fill="black" opacity="0.08"/>

      {/* ── Tiny camera icon bottom-right ──────────────────────────────────────── */}
      <g opacity="0.35" transform="translate(268 78)">
        <rect x="0" y="2" width="14" height="10" rx="2" fill="white"/>
        <circle cx="7" cy="7" r="3" fill="white" opacity="0"/>
        <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground"/>
        <rect x="4" y="0" width="6" height="3" rx="1" fill="white"/>
      </g>
    </svg>
  )
}
