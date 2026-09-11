# Where we are — resume notes

**Last session:** 11 September 2026 · **Wedding:** 13 December 2026 (93 days out)

Everything described below is committed and pushed. Nothing is half-saved.

---

## Done and live

`https://omgr.github.io/kalyanam/` — deployed by GitHub Actions on every push to
`main` (typecheck → 65 tests → build → deploy). Actions is free: the repo is public.

| Area | State |
| --- | --- |
| Event detail / edit 404 | Fixed — query-string routing on the prerendered `/events` page |
| Silent write failures (tasks, reminders, messages, location) | Fixed — `src/lib/session.ts` recovers the user id after any import |
| Backup integrity | Fixed — dates revived, payment plans + cultures exported, duplicate import refused, one transaction |
| PWA manifest | Fixed — base path baked in at build time |
| SEO | Fixed — real HTML content, per-page titles, canonicals, sitemap, robots, JSON-LD |
| Tests | 65 passing, was zero (Jest had no config at all) |
| Repo consolidation | Source now in `omgr/kalyanam`; `omgr/mdviewer` cleaned |
| Git history | Only `omgr` and `Harini Amperayani` — Slalom **and** BCG identities scrubbed from both repos |
| Credits + design system | `CREDITS.md`, `docs/DESIGN-SYSTEM.md`, README, live footer |
| Family sync | **Implemented and verified device-to-device** |
| Messages | Fixed — they never synced at all before |
| Family locator | Fixed — every device used to share one identity |
| Venue areas | Now editable and synced, was a hardcoded list |

---

## Family sync — implemented and verified working

Steps 1–3 of [`SYNC-DESIGN.md`](SYNC-DESIGN.md) are built and committed.

```
src/lib/db/records.ts            shared table + date-field maps
src/lib/sync/crdt/doc.ts         the replicated document (Yjs)
src/lib/sync/crdt/bridge.ts      two-way projection to and from Dexie
src/lib/sync/crdt/room.ts        room derivation, invite encode/decode
src/lib/sync/crdt/peer-provider.ts  Yjs sync protocol over PeerJS
src/lib/sync/crdt/index.ts       startFamilySync, merge-file import/export
src/hooks/use-family-sync.ts     React hook
src/components/sync/family-sync-panel.tsx      invite + status + merge file
src/components/sync/family-sync-join.tsx       joining, on the login screen
src/components/sync/family-sync-indicator.tsx  sidebar status, app-wide
```

**Key decision:** transport is **PeerJS, not y-webrtc**. Every public y-webrtc
signalling server is dead (verified — `wss://y-webrtc-eu.fly.dev` does not respond).
The PeerJS broker answers in ~100ms and was already a dependency.

**Verified so far**
- 43 CRDT/bridge/room tests pass, including concurrent edits to different fields
  of the same record, deletions, arbitrary update ordering, idempotence and
  late-arriving updates.
- In a real browser, device A enables sync, claims a room slot on the live PeerJS
  broker, and reports "Waiting for family". Invite + QR generate correctly.

**Verified end to end (11 Sep)**
- Two separate browser profiles, the live PeerJS broker, real WebRTC. Device B
  joined from an empty database with A's invite, received all 20 ceremonies and
  all 16 budget categories, and A's status moved to "1 device connected". Both
  devices then added a task independently and converged on identical state.
- Harness: `scratchpad/sync2.js`. The earlier hang was the harness, not the app:
  Chrome hides local IPs behind mDNS (`.local`) candidates, which two browser
  instances on one machine cannot resolve for each other. Launching with
  `--disable-features=WebRtcHideLocalIpsWithMdns` fixes it. Real phones on real
  networks are unaffected.

**Next actions, in order**
1. Get `two-devices.js` green (or find the real bug it exposes).
2. Test on two physical phones on different networks — the case that matters.
3. Step 4 of the design: connection state in the UI, relay fallback, plain-language
   failure messages.
4. Step 5: a November dry run on a venue-like network.

---

## Outstanding, not started

**Before December**
- **November rehearsal** on two physical phones on different networks, following
  [TESTING-TWO-DEVICES.md](TESTING-TWO-DEVICES.md). Section 6 (venue wifi, backgrounding,
  an actual iPhone) has no automated equivalent.
- **Sync step 4** from [SYNC-DESIGN.md](SYNC-DESIGN.md): richer connection state in the
  UI, relay fallback, plain-language failure messages.
- **Revoking an invite** is not a button yet. Today the only way to change the room
  secret is export / clear / re-import.

**SEO**
- Search Console verification file is live at `/googlec87ea44e6726ed70.html`; Madan to
  press Verify and submit `sitemap.xml`.
- Custom domain deferred by Madan. `SITE_URL` is already a build-time variable.

**Known gaps**
- Accessibility items listed at the end of [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md):
  `prefers-reduced-motion`, some icon-only labels, hover-only checklist delete.
- Rotate the GitHub PAT; it is in the keychain now but sat in plaintext for a long time.

## Local setup

```
Source + git:  ~/Personal/workspace/kalyanam        →  github.com/omgr/kalyanam
Other projects: ~/Personal/workspace/mdviewer       →  github.com/omgr/mdviewer
Real wedding data: ~/Personal/ongole_pemmaraju_kalyanam_2026-09-10.kalyanam.json

npm test                 65 tests
npm run build:pages      static export into out/
```

Test server used for browser runs: `scratchpad/serve.js` on :4321, which mimics
GitHub Pages including the 404 fallback.
