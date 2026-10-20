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
      <path d="M0 410 Q145 285 295 402 T560 375 T800 350 V600 H0Z" fill="#07111f" opacity="0.54" />
      <path d="M0 475 Q170 385 320 472 T610 425 T800 445 V600 H0Z" fill="url(#ground)" />
      <path d="M80 480 Q120 365 160 480 M125 480 Q180 330 235 480 M680 470 Q720 345 760 470" stroke="${light}" stroke-width="18" opacity="0.3" fill="none" />
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
