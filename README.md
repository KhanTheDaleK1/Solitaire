# Solitare | Mobile-First Klondike PWA

A fast, touch-optimized, offline-first Klondike Solitaire Progressive Web Application (PWA) designed for mobile devices and modern browsers, reachable at [solitare.beechem.site](https://solitare.beechem.site). Features Google and GitHub authentication for syncing player statistics and high scores across devices.

![Solitare PWA Icon](/public/icons/icon-192.png)

## Highlights

- **Mobile-First Experience**:
  - Touch gestures with haptic feedback (`navigator.vibrate`)
  - Fluid multi-card drag-and-drop with natural cascading stack offsets
  - Smart Single-Tap auto-move: tap any card to instantly send it to a foundation or legal tableau column
  - Double-tap quick move
  - iOS safe-area support (`viewport-fit=cover`, notch and home-bar padding)
- **Authentic Klondike Solitaire**:
  - Turn 1 & Turn 3 game modes
  - Standard Vegas & Klondike scoring
  - Unlimited Undo history
  - Smart Hint solver
  - Auto-Finish completion when all tableau cards are face up
  - Iconic Windows-style cascading card bounce win celebration + confetti
  - 4 felt table themes: Classic Emerald Felt, Royal Blue, Crimson, Midnight Velvet
- **PWA & Offline Capability**:
  - Installable to home screen (`manifest.webmanifest`)
  - Background Service Worker (`sw.js`) caching assets for offline play
- **Authentication**:
  - Google & GitHub OAuth sign-in via Firebase Auth
  - Offline Guest mode with local high-score tracking

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/KhanTheDaleK1/Solitare.git
cd Solitare

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` on your mobile browser or desktop.

---

## Setting Up Google & GitHub Authentication

To enable real Google and GitHub OAuth:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com).
2. Go to **Authentication** > **Sign-in method**:
   - Enable **Google**
   - Enable **GitHub**:
     - Register an OAuth app in GitHub: *Settings > Developer settings > OAuth Apps*.
     - Set the Authorization callback URL to the URL provided in Firebase (e.g. `https://<project-id>.firebaseapp.com/__/auth/handler`).
     - Enter your GitHub Client ID and Client Secret in Firebase.
3. In Firebase Project Settings, add a Web App and copy your config.
4. Create `.env` in the project root:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=solitare-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=solitare-project
   VITE_FIREBASE_STORAGE_BUCKET=solitare-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
5. Rebuild or run `npm run dev`.

*Note: If credentials are not provided, Solitare automatically runs in **Guest Mode**, allowing immediate gameplay and local stats persistence.*

---

## Deployment to `solitare.beechem.site`

### Option 1: Docker & Cloudflare Tunnel (Self-Hosted)

Run the container:
```bash
docker compose up -d --build
```

The container exposes port `8085`. Route it via Cloudflare Tunnel:
```bash
cloudflared tunnel route dns <tunnel-name> solitare.beechem.site
```
Ensure your tunnel config directs traffic for `solitare.beechem.site` to `http://localhost:8085`.

### Option 2: Cloudflare Pages / Static Hosting

1. Link the GitHub repository `KhanTheDaleK1/Solitare` in Cloudflare Pages.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add the custom domain `solitare.beechem.site`.

---

## Project Structure

```
17_Solitare/
├── .gitignore
├── GEMINI.md               # Gemini project guide (ignored by git)
├── README.md               # Project overview & documentation
├── package.json            # Node dependencies & build scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── nginx.conf              # Production Nginx configuration
├── Dockerfile              # Container multi-stage build
├── docker-compose.yml      # Docker compose configuration
├── index.html              # PWA HTML shell & scoreboard
├── public/
│   ├── manifest.webmanifest# PWA manifest
│   ├── sw.js               # Offline service worker
│   ├── robots.txt
│   └── icons/              # Vector SVG & PNG PWA icons (192, 512)
└── src/
    ├── main.ts             # Application controller & state sync
    ├── style.css           # Mobile-first felt & card styles
    ├── vite-env.d.ts       # Vite environment types
    ├── auth/
    │   ├── authService.ts  # Google & GitHub OAuth integration
    │   └── statsSync.ts    # Stats tracker & cloud sync
    ├── game/
    │   ├── types.ts        # Card, GameState, and Pile types
    │   ├── deck.ts         # Deck generator, shuffler & dealer
    │   ├── engine.ts       # Klondike rules, tap-move, hints & undo
    │   ├── dragDrop.ts     # Mobile touch & pointer drag-and-drop
    │   ├── sound.ts        # Synthesized audio & haptics
    │   └── animator.ts     # Windows card bounce cascade & confetti
    └── ui/
        └── cardRenderer.ts # Card DOM element renderer
```

---

## License

MIT © [Evan Beechem](https://beechem.site)
