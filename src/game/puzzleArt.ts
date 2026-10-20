import { JigsawPuzzleDef } from '../auth/statsSync';

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[character] || character);
}

export function getPuzzleArtwork(puzzle: JigsawPuzzleDef): string {
  const [deep, mid, light] = puzzle.colors;
  const title = escapeXml(puzzle.name);
  const icon = escapeXml(puzzle.icon);
  const badge = escapeXml(puzzle.badgeEmoji);
  const slug = puzzle.id.split('-').slice(2).join('-');
  const scene = slug.includes('sandcastle')
    ? `<path d="M0 420 Q200 370 400 420 T800 420 V600 H0Z" fill="#f8d58a" /><path d="M0 405 Q200 350 400 405 T800 405" stroke="#fef3c7" stroke-width="14" fill="none" /><path d="M280 430 V340 H330 V430 M330 430 V320 H380 V430 M380 430 V350 H430 V430 M260 340 H350 M300 320 H405" fill="#c08457" stroke="#7c2d12" stroke-width="7" /><path d="M0 480 Q150 450 300 480 T600 480 T800 470 V600 H0Z" fill="#eab308" opacity="0.32" />`
    : slug.includes('firework') || slug.includes('independence')
      ? `<path d="M0 470 Q170 405 340 465 T800 450 V600 H0Z" fill="#111827" opacity="0.75" /><g stroke="${light}" stroke-width="8" fill="none"><path d="M160 180 l-46 -78 M160 180 l0 -100 M160 180 l46 -78 M160 180 l90 -10 M160 180 l-90 -10" /><path d="M575 225 l-38 -68 M575 225 l0 -90 M575 225 l45 -72 M575 225 l84 -6 M575 225 l-76 -12" /></g><g fill="#facc15"><circle cx="160" cy="180" r="12" /><circle cx="575" cy="225" r="12" /></g>`
      : slug.includes('beach') || slug.includes('cove') || slug.includes('seaside')
        ? `<path d="M0 360 Q160 320 320 365 T640 350 T800 370 V600 H0Z" fill="#0e7490" opacity="0.82" /><path d="M0 440 Q180 400 360 445 T800 430 V600 H0Z" fill="#facc15" opacity="0.72" /><path d="M620 425 l70 -135 70 135" fill="#fef3c7" stroke="#7c2d12" stroke-width="8" /><path d="M690 290 V425" stroke="#7c2d12" stroke-width="8" />`
        : slug.includes('pumpkin') || slug.includes('halloween')
          ? `<path d="M0 420 Q180 355 370 420 T800 400 V600 H0Z" fill="#365314" opacity="0.75" /><g fill="#ea580c" stroke="#7c2d12" stroke-width="8"><ellipse cx="220" cy="425" rx="72" ry="58" /><ellipse cx="320" cy="420" rx="76" ry="62" /><ellipse cx="430" cy="430" rx="68" ry="55" /></g><g fill="#365314"><path d="M220 370 q20 -55 48 -35 q-10 35 -38 54" /><path d="M430 380 q20 -55 48 -35 q-10 35 -38 54" /></g>`
          : slug.includes('forest') || slug.includes('maple') || slug.includes('autumn')
            ? `<path d="M0 430 Q200 355 400 430 T800 410 V600 H0Z" fill="#713f12" opacity="0.78" /><g stroke="#451a03" stroke-width="18"><path d="M135 470 V245" /><path d="M365 470 V205" /><path d="M635 470 V260" /></g><g fill="#dc2626"><circle cx="135" cy="230" r="72" /><circle cx="365" cy="190" r="82" /><circle cx="635" cy="245" r="68" /></g><g fill="#f59e0b"><circle cx="80" cy="300" r="38" /><circle cx="450" cy="280" r="42" /><circle cx="700" cy="330" r="35" /></g>`
            : `<path d="M0 410 Q145 285 295 402 T560 375 T800 350 V600 H0Z" fill="#07111f" opacity="0.54" /><path d="M0 475 Q170 385 320 472 T610 425 T800 445 V600 H0Z" fill="url(#ground)" />`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${deep}" />
          <stop offset="0.58" stop-color="${mid}" />
          <stop offset="1" stop-color="${light}" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${light}" stop-opacity="0.2" />
          <stop offset="1" stop-color="#07111f" stop-opacity="0.78" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="600" fill="url(#sky)" />
      <circle cx="640" cy="130" r="88" fill="${light}" opacity="0.28" filter="url(#glow)" />
      <circle cx="640" cy="130" r="42" fill="${light}" opacity="0.72" />
      ${scene}
      <g fill="${light}" opacity="0.62">
        <circle cx="90" cy="105" r="3" /><circle cx="175" cy="180" r="4" /><circle cx="275" cy="92" r="3" />
        <circle cx="395" cy="140" r="3" /><circle cx="505" cy="65" r="4" /><circle cx="735" cy="250" r="3" />
      </g>
      <text x="400" y="295" text-anchor="middle" font-size="108" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${icon}</text>
      <text x="400" y="535" text-anchor="middle" fill="#fff" font-size="30" font-family="Georgia, serif" font-weight="700">${title}</text>
      <text x="400" y="570" text-anchor="middle" font-size="27" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${badge}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
