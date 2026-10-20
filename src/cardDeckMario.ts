type PortraitStyle = {
  hair: string;
  outfit: string;
  accent: string;
  skin: string;
  accessory: string;
  expression: string;
};

const PORTRAITS: Record<string, PortraitStyle> = {
  'Q-hearts': { hair: '#facc15', outfit: '#f43f5e', accent: '#2563eb', skin: '#ffedd5', accessory: 'crown', expression: 'smile' },
  'Q-spades': { hair: '#f8fafc', outfit: '#0d9488', accent: '#38bdf8', skin: '#fff1f2', accessory: 'star', expression: 'soft' },
  'Q-diamonds': { hair: '#c2410c', outfit: '#d97706', accent: '#10b981', skin: '#ffedd5', accessory: 'flower', expression: 'wink' },
  'Q-clubs': { hair: '#292524', outfit: '#b91c1c', accent: '#fbbf24', skin: '#fed7aa', accessory: 'hat', expression: 'smile' },
  'J-hearts': { hair: '#facc15', outfit: '#e11d48', accent: '#fbcfe8', skin: '#fde68a', accessory: 'band', expression: 'smile' },
  'J-diamonds': { hair: '#eab308', outfit: '#ec4899', accent: '#fbbf24', skin: '#fed7aa', accessory: 'ponytail', expression: 'smile' },
  'J-spades': { hair: '#ca8a04', outfit: '#4338ca', accent: '#06b6d4', skin: '#fed7aa', accessory: 'beanie', expression: 'smile' },
  'J-clubs': { hair: '#ec4899', outfit: '#ec4899', accent: '#ffffff', skin: '#fed7aa', accessory: 'mushroom', expression: 'wink' }
};

function accessoryMarkup(accessory: string, accent: string): string {
  switch (accessory) {
    case 'crown':
      return `<path fill="#eab308" stroke="#ca8a04" stroke-width="1" d="M48 31 L46 16 L56 23 L65 12 L74 23 L84 16 L81 31 Z"/><circle cx="65" cy="16" r="2.5" fill="${accent}"/>`;
    case 'star':
      return `<path fill="#cbd5e1" stroke="#94a3b8" stroke-width="1" d="M48 30 L46 16 L56 24 L65 12 L74 24 L84 16 L81 30 Z"/><circle cx="65" cy="15" r="2.5" fill="${accent}"/>`;
    case 'flower':
      return `<circle cx="65" cy="20" r="8" fill="${accent}"/><circle cx="65" cy="20" r="3" fill="#fbbf24"/>`;
    case 'hat':
      return `<ellipse cx="65" cy="27" rx="28" ry="6" fill="#dc2626"/><path fill="#991b1b" d="M51 27 C51 17 58 13 65 13 C72 13 79 17 79 27 Z"/>`;
    case 'ponytail':
      return `<path fill="${accent}" d="M80 36 C116 8 137 55 105 101 C93 77 91 47 80 36 Z"/>`;
    case 'beanie':
      return `<path fill="${accent}" d="M47 35 Q65 22 83 35 L80 41 L50 41 Z"/>`;
    case 'mushroom':
      return `<circle cx="29" cy="67" r="14" fill="${accent}"/><circle cx="101" cy="67" r="14" fill="${accent}"/><circle cx="29" cy="67" r="4" fill="#fff"/><circle cx="101" cy="67" r="4" fill="#fff"/><ellipse cx="65" cy="39" rx="25" ry="17" fill="${accent}"/><circle cx="65" cy="34" r="5" fill="#fff"/>`;
    case 'band':
      return `<path fill="${accent}" d="M44 32 Q65 20 86 32 Q65 25 44 32 Z"/>`;
    default:
      return '';
  }
}

function faceExpression(expression: string): string {
  if (expression === 'wink') {
    return '<ellipse cx="58" cy="51" rx="2.2" ry="1.7" fill="#1e293b"/><path stroke="#1e293b" stroke-width="1.8" fill="none" d="M70 51 Q74 48 78 51"/>';
  }
  return '<ellipse cx="58" cy="50" rx="2.2" ry="1.7" fill="#1e293b"/><ellipse cx="72" cy="50" rx="2.2" ry="1.7" fill="#1e293b"/>';
}

/** Renders the lightweight Mushroom Kingdom court illustrations. */
export function getMarioWaifuPortrait(rank: string, suit: string): string {
  const style = PORTRAITS[`${rank}-${suit}`];
  if (!style) return '';
  const faceTop = rank === 'J' && style.accessory === 'mushroom' ? 48 : 31;
  const faceBottom = rank === 'J' && style.accessory === 'mushroom' ? 78 : 77;

  return `<svg viewBox="0 0 130 150" class="mario-portrait-svg" role="img" aria-label="Mushroom Kingdom ${rank} of ${suit}">
    <circle cx="65" cy="78" r="55" fill="${style.accent}" opacity=".12"/>
    <path fill="${style.hair}" d="M14 72 C-4 104 14 143 34 150 C22 120 18 92 31 68 Z"/>
    <path fill="${style.hair}" d="M116 72 C134 104 116 143 96 150 C108 120 112 92 99 68 Z"/>
    ${accessoryMarkup(style.accessory, style.accent)}
    <path fill="${style.outfit}" d="M28 150 C33 111 46 99 65 99 C84 99 97 111 102 150 Z"/>
    <path fill="${style.accent}" opacity=".8" d="M40 108 Q65 120 90 108 Q65 100 40 108 Z"/>
    <path fill="${style.skin}" d="M48 ${faceTop + 18} C48 ${faceTop + 3} 55 ${faceTop - 4} 65 ${faceTop - 4} C75 ${faceTop - 4} 82 ${faceTop + 3} 82 ${faceTop + 18} C82 ${faceBottom - 3} 74 ${faceBottom} 65 ${faceBottom} C56 ${faceBottom} 48 ${faceBottom - 3} 48 ${faceTop + 18} Z"/>
    ${faceExpression(style.expression)}
    <path stroke="${style.outfit}" stroke-width="1.8" fill="none" d="M60 64 Q65 68 70 64"/>
  </svg>`;
}

export function getMarioWaifuAce(suit: string): string {
  if (suit !== 'spades') return '';
  return `<svg viewBox="0 0 100 120" class="mario-ace-svg" aria-label="Lubba ace of spades">
    <path fill="#0f172a" d="M50 15 C50 15 88 48 88 64 C88 78 78 84 66 84 C55 84 52 76 50 72 C48 76 45 84 34 84 C22 84 12 78 12 64 C12 48 50 15 50 15 Z"/><path fill="#0f172a" d="M46 76 L40 105 L60 105 L54 76 Z"/>
    <circle cx="50" cy="54" r="16" fill="#a855f7" stroke="#fbbf24" stroke-width="2"/><polygon points="50,42 53,50 62,50 54,55 57,64 50,59 43,64 46,55 38,50 47,50" fill="#fde047"/><circle cx="50" cy="54" r="4" fill="#38bdf8"/>
  </svg>`;
}
