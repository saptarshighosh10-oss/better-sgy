Create one horizontal sprite strip for the 2D game character `evara` in animation `idle-lineup`.

Use the attached reference image(s) for character identity and the attached base character image as the canonical design. Use the attached layout guide only for frame count, slot spacing, centering, and safe padding. Do not copy visible guide lines, boxes, labels, or background.

Identity lock:
- Do not redesign the character. Only change pose/action for the `idle-lineup` animation.
- Preserve the same head/body proportions, face, costume, markings, palette, outline weight, accessory design, prop attachment, and overall silhouette from the canonical base character.
- Keep every frame recognizably the same individual character, not a related variant.
- If the character has a weapon, tool, backpack, cape, hair style, hat, or accessory, preserve its design and attachment style unless this specific action requires pose-only movement.
- Prefer a subtler animation over any change that mutates identity.

Output exactly 8 separate animation frames arranged left-to-right in one single row. Each frame must show the same character: original teen female superhero with a slim athletic build. Long flowing soft pink/magenta hair past her shoulders, light skin. Wears a tight pink bodysuit with a white central section. Pink domino mask across the eyes only, hair visible above and around it. Pink gloves and pink boots. A circular atomic orbit emblem on the chest. Controlled floaty hover pose, hands slightly raised, effortlessly composed expression..

Style contract: clean 2D cartoon game sprite style, vector-clean edges but raster output, bold outline, flat cel shading, readable full-body poses, no 3D render, no glossy app icon lighting. Additional user style notes: clean 2D comic flat colors, thick black outlines, bold color blocking, no gradients, animated series style, bright pink and white palette, clear silhouette defined by long pink hair.
Camera/view: front-facing.
Animation action: hovering slightly off the ground in a lineup for a family photo, floating gently up and down, hands relaxed at sides or slightly out, looking at camera with effortless cool confidence.

Animation-specific requirements:
- Use subtle breathing, blink, or small head/hand shifts; do not redesign the character.

Transparency and artifact rules:
Chroma-key background contract:
- The canvas background outside the sprite must be the exact solid color #FF00FF (magenta) from edge to edge.
- Every non-character background pixel must use that same RGB value. No gradients, vignettes, texture, shadows, glows, floor plane, anti-aliased haze, lighting variation, or alternate background hue.
- Keep a clean uninterrupted #FF00FF border around the whole image so automated background auditing can verify the key color.
- If the style lighting conflicts with a flat background, simplify the lighting on the sprite instead of changing, shading, or decorating the background.

- Use one perfectly flat chroma-key background color across the whole output; the exact RGB value is specified in the chroma-key background contract.
- Do not include scenery, ground, UI panels, text, frame numbers, labels, watermarks, visible guide lines, borders, checkerboard transparency, or white/black backgrounds.
- Do not draw detached effects such as floating stars, loose sparkles, motion arcs, speed lines, dust clouds, separated smoke, loose tears, speech bubbles, punctuation, or symbols unless the user explicitly requested them and they remain attached to the character silhouette.
- Avoid shadows, glows, halos, motion blur, smears, impact bursts, landing marks, and floor patches because they usually break transparent extraction.
- Do not use the chroma-key color, or colors close to it, inside the character, props, highlights, shadows, or effects.
- Every frame must contain one complete self-contained pose with safe padding. No body part may be clipped or cross into a neighboring frame slot.

Layout requirements:
- Exactly 8 full-body frames, left to right, in one horizontal row.
- Treat the image as 8 equal-width invisible frame slots of 128x192 each.
- Fill every slot with exactly one complete pose.
- Spread poses evenly across the whole image width; do not leave requested slots blank.
- Center one complete pose in each slot. No pose may cross into a neighboring slot.
- Use a perfectly flat pure magenta #FF00FF chroma-key background across the whole image.
- Do not draw visible grid lines, borders, labels, numbers, watermarks, or checkerboard transparency.
- Keep the rendering sprite-like and animation-ready: readable silhouette, limited palette, clean outline/edge treatment, consistent proportions, and minimal tiny detail.
- Keep every frame self-contained with safe padding. No body part should be clipped by the frame slot.
- Avoid motion blur. Use clear pose changes readable at the target cell size.
- Do not use #FF00FF, pure magenta, or colors close to that chroma key inside the character, props, highlights, shadows, motion marks, dust, landing marks, or effects.
