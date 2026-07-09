# Palimpsest

A note archive that pulls old entries back to be rewritten, not just reread.

## What it does

- Set a note down (text and/or a photo, with optional tags).
- New notes wait 10 minutes, then become eligible to resurface.
- Every visit auto-pulls the two longest-waiting notes into "Returning to you."
- Tap "resurface another pair" anytime for a fresh set.
- Tap **rewrite** on any note to revise it in place — the old text shows as a
  faded, struck-through ghost line above the new one while you write, then the
  note's revision count (in Roman numerals) goes up.
- Everything lives in IndexedDB, on-device. Nothing is sent anywhere.
- "export json" downloads a full backup, photos included as base64.

## Deploying to Cloudflare Pages

1. Create a new Pages project (Dashboard → Workers & Pages → Create → Pages
   → Direct upload, or connect a git repo).
2. Upload this whole folder as-is — no build step needed, it's static files.
3. Set the build output directory to the project root (`/`).
4. Deploy. Cloudflare will serve it over HTTPS, which is required for the
   service worker and install prompt to work.

## Installing on a phone

1. Open the deployed URL in Chrome (Android) or Safari (iOS).
2. Android: tap the menu → **Install app** (or **Add to Home screen**).
   iOS: tap Share → **Add to Home Screen**.
3. Open it once while online so the service worker can cache the app shell.
4. After that, it opens and works fully in airplane mode — composing,
   editing, resurfacing, all of it. Only cross-device sync is out of scope;
   each install keeps its own on-device archive. Use "export json"
   periodically as a manual backup, or before switching phones.

## Files

- `index.html` / `styles.css` / `app.js` — the app itself
- `sw.js` — service worker, caches the shell for offline use
- `manifest.json` — makes it installable
- `icons/` — home-screen icons
