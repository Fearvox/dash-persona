/**
 * CodeArtBackground — Server Component
 *
 * Generates deterministic "DASH" text spans scattered across the viewport
 * using a seeded mulberry32 PRNG so SSR and client produce identical output.
 *
 * Design: edges are dense, center 30% is near-invisible (暗角模式).
 * A radial-gradient vignette overlay darkens the edges for brand contrast.
 */

// ── Mulberry32 seeded PRNG ──────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Color palette (CSS variable references) ─────────────────────────
const COLORS = [
  'var(--accent-green)',
  'var(--accent-yellow)',
  'var(--accent-blue)',
  'var(--accent-red)',
  'var(--accent-highlight)',
];

interface CodeArtBackgroundProps {
  count: number;
}

export default function CodeArtBackground({ count }: CodeArtBackgroundProps) {
  const rand = mulberry32(42);

  // Helper: get a random float in [min, max)
  const range = (min: number, max: number) => min + rand() * (max - min);

  const spans = Array.from({ length: count }, (_, i) => {
    const top = range(0, 100);
    const left = range(0, 100);
    const fontSize = range(10, 48);
    const rotation = range(-15, 15);
    const colorIndex = Math.floor(rand() * COLORS.length);
    const color = COLORS[colorIndex];

    // 暗角模式: center 30% horizontal & vertical → barely visible
    const inCenterH = left >= 35 && left <= 65;
    const inCenterV = top >= 35 && top <= 65;
    const inCenter = inCenterH && inCenterV;
    const opacity = inCenter ? range(0.01, 0.03) : range(0.03, 0.12);

    // Animation parameters (randomized drift)
    const duration = range(8, 20);
    const delay = range(0, -10); // negative delay = start partway through
    const dx = range(5, 25);
    const dy = range(5, 25);

    return (
      <span
        key={i}
        aria-hidden="true"
        className="code-drift-span"
        style={{
          position: 'absolute',
          top: `${top}%`,
          left: `${left}%`,
          fontSize: `${fontSize}px`,
          color,
          opacity,
          transform: `rotate(${rotation}deg)`,
          animation: `code-drift ${duration}s ease-in-out ${delay}s infinite`,
          willChange: 'transform, opacity',
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          // CSS custom properties for the keyframe
          '--rot': `${rotation}deg`,
          '--dx': `${dx}`,
          '--dy': `${dy}`,
        } as React.CSSProperties}
      >
        DASH
      </span>
    );
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Scattered text elements */}
      {spans}

      {/* Radial vignette overlay — darkens edges, keeps center clear */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, var(--bg-primary) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
