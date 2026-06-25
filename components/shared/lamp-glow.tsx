// A spotlight that switches on above the content it sits behind.
// Inspired by Aceternity UI's Lamp effect, rebuilt with theme-token colors
// and transform/opacity-only animation so it stays GPU-friendly and adapts
// across all themes (including the game/show palettes).
export function LampGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 flex h-[240px] justify-center overflow-hidden"
    >
      <div className="lamp-glow absolute -top-24 h-64 w-64 rounded-full bg-destructive/25 blur-[70px]" />
      <div className="lamp-glow absolute -top-10 h-32 w-32 rounded-full bg-destructive/30 blur-[40px]" />
      <div className="lamp-beam absolute top-20 h-px w-56 bg-gradient-to-r from-transparent via-destructive/60 to-transparent" />
    </div>
  )
}
