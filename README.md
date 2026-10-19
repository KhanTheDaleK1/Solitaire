# Solitaire | MobilityWare Klondike PWA

A fast, touch-optimized, offline-capable **MobilityWare Solitaire** clone built as a Progressive Web Application (PWA), live at [solitaire.beechem.site](https://solitaire.beechem.site) (and [solitare.beechem.site](https://solitare.beechem.site)). Features 3D card flip animations, realistic card foley & ascending foundation chimes, Winning Deals, Daily Challenges, Jigsaw Puzzle events, Rankings, customizable card faces/backs/backgrounds, and Google & GitHub cloud sync.

![Solitaire PWA Icon](/public/icons/icon-192.png)

## Highlights

- **MobilityWare Gameplay & Animations**:
  - **3D Card Flip Animations** (`rotateY` 3D perspective turn) and staggered **Deal Riffle** animations
  - **Play Menu**: *Winning Deal* (guaranteed solvable), *Random Shuffle*, *Replay Current Deal*, and *Daily Challenge*
  - **Turn 1 & Turn 3** draw modes + **Standard** and **Vegas** (`-$52` buy-in) scoring modes
  - Smart Single-Tap auto-move, multi-card drag-and-drop, Left-Handed mode, Unlimited Undo, Hint solver, and Auto Complete
  - Iconic cascading card bounce victory celebration + confetti
- **MobilityWare Sound Effects**:
  - Web Audio paper-friction card flip & placement foley
  - Staggered 7-column deal riffle and stock recycle shuffle sounds
  - **13-Rank Ascending Foundation Chimes** (Ace through King musical progression)
- **Daily Challenges, Jigsaw Puzzles & Rankings**:
  - **Daily Crown Calendar**: Deterministic daily deals with monthly Bronze, Silver, and Gold Trophies
  - **Jigsaw Puzzle Events**: 6 interactive 16-piece jigsaw puzzles (*Autumn Cabin*, *Tropical Cove*, *Alpine Express*, *Starlight Castle*, *Golden Reef*, *Royal Gardens*)
  - **Rankings & Leaderboards**: Player XP/Stars leveling, Rank Titles (*Solitaire Royalty*, *Grandmaster*, etc.), and All-Time Leaderboard
- **Card Designs & Table Backgrounds**:
  - **4 Card Face Styles**: Classic (with illustrated SVG Jack/Queen/King court portraits, top-right suit pips, and ornate Ace of Spades), Big Index, Dark, and Crown
  - **6 Card Back Designs**: Blue Lattice, Red Lattice, Royal Crown, Ocean Wave, Emerald Crest, and Starlight Galaxy
  - **8 Table Backgrounds**: Classic Green Felt, Royal Blue, Casino Crimson, Mahogany Wood, Tropical Ocean, Starlight Sky, Royal Amethyst, and Midnight Obsidian
- **Authentication & Cloud Save Sync**:
  - **GitHub & Google Account Sign-In**: Seamless popup & instant profile sign-in with server-side cloud save synchronization (`/api/cloud/sync`)
  - **MobilityWare Save Importer**: Import stats directly from Android `.xml`, iOS `.plist`, `.sqlite`, or `.json` backups

---

## Getting Started

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Build production bundle
npm run build

# 3. Start production server (http://127.0.0.1:3333)
npm start

# Or run Vite dev server (http://localhost:3000)
npm run dev
```

---

## Project Structure

```
17_Solitaire/
├── .env.example            # OAuth & optional Firebase environment template
├── .gitignore
├── GEMINI.md               # Project context guide (ignored by git)
├── README.md               # Project overview & documentation
├── package.json            # Node dependencies & build scripts
├── server.js               # Production HTTP server, GitHub/Google OAuth & Cloud Sync API
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with /api proxy
├── nginx.conf              # Nginx configuration
├── Dockerfile              # Container multi-stage build
├── docker-compose.yml      # Docker compose configuration
├── index.html              # PWA HTML shell, HUD & modals
├── public/
│   ├── manifest.webmanifest# PWA manifest
│   ├── sw.js               # Offline service worker
│   ├── robots.txt
│   └── icons/              # Vector SVG & PNG PWA icons (192, 512)
└── src/
    ├── main.ts             # Application controller, modals & state sync
    ├── style.css           # Table themes, 3D animations, card faces & backs
    ├── vite-env.d.ts       # Vite environment types
    ├── auth/
    │   ├── authService.ts  # Google & GitHub OAuth + instant profile sign-in
    │   ├── statsSync.ts    # Stats tracker, Rank tiers, Puzzles & cloud sync
    │   └── importer.ts     # MobilityWare XML/Plist/SQLite/JSON save importer
    ├── game/
    │   ├── types.ts        # Card, GameState, Animation, and Progression types
    │   ├── deck.ts         # Deck generator, shuffler & Winning Deal generator
    │   ├── dailyChallenge.ts # Deterministic Mulberry32 daily challenge dealer
    │   ├── engine.ts       # Klondike & Vegas rules, tap-move, hints & undo
    │   ├── dragDrop.ts     # Mobile touch & pointer drag-and-drop
    │   ├── sound.ts        # Synthesized paper foley & ascending chimes
    │   └── animator.ts     # Cascading card bounce physics & confetti
    └── ui/
        └── cardRenderer.ts # 3D card flipper & SVG court card renderer
```

---

## License

MIT © [Evan Beechem](https://beechem.site)
