# EMIL Trade — native trading platform of EMIL

**What this is:** a clone of the GIO Raptor terminal (`aby777333-pixel/Gioraptor`, live at
`dashing-hamster-0028ed.netlify.app`) taken 2026-09-03, rebranded **EMIL Trade** and placed
inside the EMIL repo as a standalone Next.js 16 app. The original Raptor repo and site are
untouched.

**Backend:** same Supabase project as Raptor (`leumpgkfillgeyyfptef`) — accounts, logins and
trading data are shared, so `?account=NX-100008` deep links keep working.

**EMIL connection:** the in-terminal EMIL console (`components/trading/emil/*`) was removed.
Every EMIL surface (top-nav item, 🧠 EMIL chip, ABIN "Ask EMIL"/"Arm EMIL", command palette,
`/terminal/emil`) now opens the **EMIL Control Cockpit** in a new tab —
`NEXT_PUBLIC_EMIL_COCKPIT_URL` (see `src/lib/emil-link.ts`), default
`https://serene-frangollo-a3c59c.netlify.app`. The cockpit links back here from the Global API
Hub "Trade With EMIL" card, the sidebar "EMIL Trade" item and the ⌘K palette (all new-tab).

**Deploy (manual, own Netlify site `emil-trade` / id `56cac256-2896-473c-b43a-dd8105162792`):**

```bash
cd emil-trade
rm -rf .next
npx netlify deploy --build --prod --site 56cac256-2896-473c-b43a-dd8105162792
```

The parent EMIL repo's Netlify site (`serene-frangollo-a3c59c`) builds from the repo root and
ignores this folder (`tsconfig.json` excludes `emil-trade`). Never run `next build` here while a
`next dev` is running in the same folder.
