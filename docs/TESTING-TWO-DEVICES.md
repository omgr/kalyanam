# Testing on Two Devices

A rehearsal script for before the wedding. Work through it with two real devices on two
different networks — not two tabs on one laptop, which hides most of what can go wrong.

Budget about 40 minutes. Do it **once in November**, on devices the family will actually use.

---

## Installing as an app — read this first

Opening the site on a phone offers to **install** it. Worth doing: it gets its own icon,
opens without browser chrome, and works offline. But there are two traps.

### Android (Chrome) — storage is shared

The installed app and Chrome share the same storage for this site. Your wedding appears in
both, and a change in one shows up in the other. That is expected and safe.

> ### ⚠️ Turn off "Desktop site" before installing
> If Chrome had **Request desktop site** enabled when you installed, **the installed app keeps
> that setting permanently** and you get a cramped desktop layout on a phone, with no obvious
> way back.
>
> **To fix:** uninstall the app, open the site in Chrome, tap ⋮ and **uncheck Desktop site**,
> reload, then install again.

### iPhone / iPad (Safari) — storage may be separate

On iOS, a site added to the Home Screen has historically been given **its own storage**,
separate from Safari. If you add Kalyanam to the Home Screen and it opens **empty**, that is
why — it is not data loss, Safari still has your copy.

**Do not panic and re-import.** Instead, treat the Home Screen app as a new device: join it
with a Family Sync invite, or apply a merge file. **Verify this on an actual iPhone before the
wedding** if anyone in the family uses one — it is the single most likely surprise.

### Both platforms

- **Never use a private/incognito window.** Storage is wiped when it closes.
- **Clearing browsing data deletes the wedding** on that device. Keep a backup.

---

## The test script

Two devices, **on different networks** (one on wifi, one on mobile data). Call them **A**
(has the wedding) and **B** (empty).

### 1 · Connect · ~5 min

| | Step | Expect |
| --- | --- | --- |
| 1.1 | A: Sync & Backup → Turn on Family Sync | QR code and invite appear; status *Waiting for family* |
| 1.2 | B: Login / Sync → Join with Family Sync → scan QR | Progress message, then *Joined "…"* |
| 1.3 | B: open Dashboard | Same wedding name, same countdown |
| 1.4 | B: open Events | All ceremonies present, same dates |
| 1.5 | A: check sidebar | Says **1 device** |
| 1.6 | B: pick who you are on **Find Family** | Name appears on A's Family list |

### 2 · Live editing · ~10 min

| | Step | Expect |
| --- | --- | --- |
| 2.1 | A: add task "Book priest" | Appears on B within ~10s |
| 2.2 | B: tick it complete | Shows complete on A |
| 2.3 | A: change a ceremony's **time** · B: change the same ceremony's **venue** — at the same time | **Both changes survive.** This is the important one. |
| 2.4 | A: add a guest | Appears on B |
| 2.5 | B: add an expense | Appears on A; budget totals match |
| 2.6 | A: delete a task | Disappears on B |

> **2.3 is the test that matters.** If one of the two edits vanishes, stop and report it —
> everything else in this design rests on both surviving.

### 3 · Offline and reconnecting · ~10 min

| | Step | Expect |
| --- | --- | --- |
| 3.1 | B: turn on aeroplane mode | App still works fully |
| 3.2 | B: add two tasks while offline | Saved locally, no errors |
| 3.3 | A: meanwhile add a different task | Fine |
| 3.4 | B: turn aeroplane mode off, open the app | Within ~30s **all three tasks on both devices** |
| 3.5 | Both: close the app entirely, reopen | Everything still there |

### 4 · Messages and finding family · ~5 min

| | Step | Expect |
| --- | --- | --- |
| 4.1 | A: set up **Venue Areas** | Areas appear on B without B doing anything |
| 4.2 | B: pick an area, Share Location | A sees B in that area, with the right name |
| 4.3 | A: send an *Announcement* | Arrives on B, shown as from A |
| 4.4 | B: reply | Arrives on A |

### 5 · Backup and merge files · ~5 min

| | Step | Expect |
| --- | --- | --- |
| 5.1 | A: Export Data | `.kalyanam.json` downloads |
| 5.2 | A: import that same file again | Offers to **replace** rather than duplicating |
| 5.3 | A: Family Sync → Merge file → **Save** | `.kmerge` downloads |
| 5.4 | B: Merge file → **Apply** that file | "Changes merged"; nothing duplicated |
| 5.5 | B: apply it a **second** time | Still nothing duplicated — it is idempotent |

### 6 · The realistic venue rehearsal · ~5 min

| | Step | Expect |
| --- | --- | --- |
| 6.1 | Both on the same wifi | Connects, usually faster |
| 6.2 | B: background the app for 2 min, then reopen | Reconnects; changes catch up |
| 6.3 | Lock B's screen for 5 min, then reopen | Same — nothing lost |
| 6.4 | Try on the venue's guest wifi if you can get there | Some public wifi blocks peer-to-peer; if so, plan on merge files |

---

## What counts as a real failure

Report these:

- **An edit disappears** after two people edit at once.
- **Duplicated records** after syncing or applying a merge file.
- **A date shifting** by hours or days.
- **Money not adding up** after edits on both devices.
- **Someone else's name** on your message or location.
- **Data lost** after closing and reopening.

These are **not** failures — they are the design working as intended:

- Nothing syncing while the app is closed or backgrounded for a while.
- *Waiting for family* when nobody else has it open.
- Needing to reopen the app to catch up.
- Peer-to-peer failing on a restrictive network (use merge files).

---

## Before you call it ready

- [ ] Every family device has joined and picked who they are
- [ ] Venue areas set up and visible on all devices
- [ ] Section 2.3 passed — concurrent edits both survived
- [ ] Section 3 passed — offline edits merged on reconnect
- [ ] Tested on the oldest phone in the family, not just the newest
- [ ] Tested on an iPhone if anyone uses one (see the storage note above)
- [ ] A backup exported and stored somewhere off the device
- [ ] Everyone knows to open the app to catch up, and to ring for anything urgent

---

## The automated version

The repository has a scripted version of sections 1–2, driving two separate browser profiles
over the real broker:

```bash
node scratchpad/sync2.js
```

It cannot replace real phones on real networks — it runs on one machine, and needs
`--disable-features=WebRtcHideLocalIpsWithMdns` because Chrome hides local IPs from other
browser instances on the same host. Real devices never hit that. **Section 6 in particular has
no automated equivalent**, which is why the November rehearsal matters.
