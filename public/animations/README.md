# /public/animations/

Place `.riv` animation files here. Next.js serves this folder as static assets.

## chip.riv — custom mascot (not yet built)

The full mascot needs to be built in Rive Studio (https://rive.app).

### idle_sleep animation reference (future use only)

**Sleepy Cat — Falling Asleep Loop** by metamom_mama
https://rive.app/marketplace/25457-47508-sleepy-cat-falling-asleep-loop/
License: CC BY 4.0 — attribution required if used

Behavior matches the `idle_sleep` state exactly:
- yawn → drowsy head-drop → curl up → Zzz loop → tap-to-wake

Use this as the animation reference ONLY when building `idle_sleep` in Rive Studio.
Do not install or activate this asset until Milestone 5 (mascot polish).

Near-term placeholder path: download the asset above, save as `chip.riv` here.
The MascotRive component will pick it up automatically on next dev server restart.

### Custom Chip spec (for the Rive animator)

Character: original orange tabby cat, no clothing, friendly/round proportions.

State machine name: `ChipStateMachine`

Inputs:
| Name                    | Type    | Notes |
|-------------------------|---------|-------|
| `idleLevel`             | Number  | 0=default, 1=pacing (20s), 2=sleeping (45s) |
| `isRefreshing`          | Boolean | true while data refresh is in-flight |
| `hasMissingAssignments` | Boolean | true when missingCount > 0 |
| `noMissingAssignments`  | Boolean | true when missingCount === 0 |
| `isHovered`             | Boolean | true on mouse enter, false on leave |
| `triggerKnock`          | Trigger | fires randomly during pacing state |
| `triggerGirlfriendVisit`| Trigger | fires 1/10000 — rare pink cat visit |

Animation state names:
- `idle_default`
- `idle_pacing`
- `idle_knock_glass`
- `idle_sleep`
- `refresh_working`
- `missing_pointing`
- `no_missing_sitting`
- `hover_nod`
- `special_girlfriend_visit`

### Credits
Sleepy Cat placeholder by metamom_mama — CC BY 4.0
https://rive.app/marketplace/25457-47508-sleepy-cat-falling-asleep-loop/
