# Kalyanam Architecture

How a wedding planner works with **no backend at all** — no server, no account, no
cloud copy of your family's data — and still keeps everyone's devices in step.

---

## 1. The shape of it

Everything runs in the browser. There is no API to call, because there is no server
to call it on.

```mermaid
flowchart TB
    subgraph device["📱 One family member's device"]
        ui["React UI<br/><i>events · guests · budget · tasks</i>"]
        hooks["Dexie live queries<br/><i>useLiveQuery</i>"]
        dexie[("IndexedDB via Dexie<br/><i>18 tables</i>")]
        crdt["Yjs document<br/><i>the replicated state</i>"]
        ydb[("IndexedDB<br/><i>CRDT persistence</i>")]

        ui <--> hooks
        hooks <--> dexie
        dexie <-. "bridge" .-> crdt
        crdt <--> ydb
    end

    subgraph static["☁️ GitHub Pages"]
        files["HTML · JS · CSS<br/><i>static files only</i>"]
    end

    files -- "downloaded once,<br/>then works offline" --> device

    style device fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    style static fill:#f5f5f5,stroke:#9e9e9e
    style dexie fill:#ffe082,stroke:#ff8f00
    style crdt fill:#f8bbd9,stroke:#c2185b
```

GitHub Pages serves files. It never sees your data, because your data never leaves the
device except to go directly to another family member's device.

**Why two stores?** Dexie is what the UI reads and writes — every screen, hook and query
was built against it and still is. The Yjs document is the *replicated* copy: the thing
that knows how to merge with other devices. A bridge keeps them in step, so twelve
thousand lines of UI never had to learn that sync exists.

---

## 2. Why sync is hard without a server

This is the part worth understanding, because the obvious objection is correct:
**two browsers on different networks cannot find each other.**

Your phone on 4G and your mother's phone on the venue's wifi both sit behind NAT. Neither
has a public address. Neither can accept an incoming connection. Without help they are
invisible to one another.

There are three separate problems, and only the first needs anyone else involved:

```mermaid
sequenceDiagram
    participant A as 📱 Your phone
    participant S as 🔎 PeerJS broker
    participant T as 📡 STUN server
    participant B as 📱 Mum's phone

    Note over A,B: 1. Introductions — the only third party
    A->>S: I am slot 0 of room a3f9…
    B->>S: I am slot 1 of room a3f9…
    B->>S: connection offer for slot 0
    S->>A: here is Mum's offer
    A->>S: here is my answer
    S->>B: here is the answer

    Note over A,B: 2. Finding a route through NAT
    A->>T: what does my address look like from outside?
    T-->>A: 82.14.x.x:51820
    B->>T: and mine?
    T-->>B: 176.23.x.x:49precise

    Note over A,B: 3. The data itself
    A-->>B: direct encrypted connection
    B-->>A: wedding data, peer to peer
```

**What each party actually sees:**

| | What it handles | What it can see |
| --- | --- | --- |
| **PeerJS broker** | Introductions only | That two anonymous ids want to talk. Never any wedding data. |
| **STUN server** | "What is my public address?" | One UDP question. No data at all. |
| **The other device** | Everything | The whole wedding — it is family, that is the point. |

So the honest framing is not *"is there a third party"* but *"what can it see"*. The answer
is: enough to make an introduction, and nothing else.

> **Why not y-webrtc?** It is the usual recommendation, but every public signalling server
> it ships with is dead — its own default, `wss://y-webrtc-eu.fly.dev`, does not respond.
> The PeerJS broker answers in about 100ms and was already a dependency here.

---

## 3. Finding each other without announcing it

A room needs to be findable by family and invisible to everyone else. The room id is
derived by hashing the wedding id together with a secret generated once per wedding:

```mermaid
flowchart LR
    wid["wedding id<br/><i>travels inside<br/>exported backups</i>"] --> hash
    secret["room secret<br/><i>never leaves the<br/>family</i>"] --> hash
    hash["SHA-256"] --> room["room id<br/><i>a3f9c2…</i>"]
    room --> s0["kal-a3f9c2-0"]
    room --> s1["kal-a3f9c2-1"]
    room --> s2["kal-a3f9c2-…"]

    style secret fill:#ffcdd2,stroke:#c62828
    style room fill:#c8e6c9,stroke:#2e7d32
```

Both halves are needed, so a leaked backup — which contains the wedding id — does not
reveal the room.

Rather than electing a host, **every device claims the lowest free numbered slot and dials
all the others.** No device is special, and losing one does not break the mesh:

```mermaid
flowchart LR
    A["slot 0<br/>📱 you"] <--> B["slot 1<br/>📱 mum"]
    B <--> C["slot 2<br/>💻 sister"]
    A <--> C
```

The old six-character sync code is gone. Six characters is roughly 30 bits, and with no
server to exchange them through it could not be made safe — anyone could enumerate them
against the broker. The invite carries the whole secret instead, which is why it is long
enough to want scanning or pasting rather than typing.

---

## 4. What makes offline editing safe

At a wedding, **two people editing at once while offline is the normal case, not the edge
case.** Your mother ticks off a task on the venue's terrible wifi; you change the Muhurtham
time on 4G. Both then reconnect.

A "last sync wins" merge silently throws one of those away. A CRDT does not:

```mermaid
flowchart TB
    start["Muhurtham<br/>time 09:00 · venue Hall A"]
    start --> a["📱 You, offline<br/>time → 10:30"]
    start --> b["📱 Mum, offline<br/>venue → Sai Gardens"]
    a --> merge{{"they reconnect"}}
    b --> merge
    merge --> lww["❌ last-write-wins<br/>one edit is lost"]
    merge --> crdtres["✅ CRDT<br/>time 10:30 · venue Sai Gardens<br/><i>both survive</i>"]

    style lww fill:#ffcdd2,stroke:#c62828
    style crdtres fill:#c8e6c9,stroke:#2e7d32
```

This works because each record is stored as a **map of fields**, not as one opaque blob.
Two people touching different fields never collide at all. When they touch the *same*
field, one value wins — but deterministically, and every device agrees on which.

```
events ─┬─ e1 ─┬─ name    "Muhurtham"
        │      ├─ time    "10:30"        ← changed on your phone
        │      └─ venue   "Sai Gardens"  ← changed on Mum's phone
        └─ e2 ─┬─ name    "Kashi Yatra"
               └─ …
```

---

## 5. Why the merge file matters as much as the network

Because merging is **order-independent and idempotent**, it does not matter *how* the bytes
travel or in what order they arrive. Every transport becomes a valid sync channel:

```mermaid
flowchart LR
    subgraph transports["all equally valid"]
        direction TB
        p2p["live peer-to-peer<br/><i>both devices open</i>"]
        file["merge file over WhatsApp<br/><i>neither online together</i>"]
        qr["QR code<br/><i>no network at all</i>"]
    end
    transports --> same["identical merged result"]
    style same fill:#c8e6c9,stroke:#2e7d32
```

A **merge file** is not a backup. A backup *replaces*; a merge file *combines*, and applying
it twice is harmless. That is what makes a no-backend design genuinely workable rather than
merely appealing — when nobody is online at the same time, someone sends a file, and the
result is exactly what a live connection would have produced.

| | Backup (`.kalyanam.json`) | Merge file (`.kmerge`) |
| --- | --- | --- |
| Effect | Replaces what is there | Combines both sides |
| Applying twice | Refused as a duplicate | Harmless |
| Use | Safekeeping, moving to a new device | Keeping two devices in step |

---

## 6. How a change travels

```mermaid
sequenceDiagram
    participant U as You
    participant D as Dexie
    participant BR as Bridge
    participant Y as Yjs doc
    participant P as Peer
    participant BR2 as Their bridge
    participant D2 as Their Dexie

    U->>D: tick off "Book the priest"
    D-->>BR: Dexie hook fires
    BR->>Y: write the changed field
    Y->>P: encoded update
    P->>Y: applied on their device
    Y-->>BR2: observer fires
    BR2->>D2: write through
    D2-->>U: their screen updates
```

The one hazard is an **echo**: applying a remote change writes to Dexie, whose hooks would
mirror it straight back out again, forever. A re-entrancy flag suppresses that — and it has
to be checked *synchronously inside the hook*, because that is the only moment it is
reliably set.

---

## 7. What is deliberately not synced

| Table | Why not |
| --- | --- |
| `messages` | Duplicates what the family already does in WhatsApp |
| `locationPings` / `locationRequests` | Ephemeral and privacy-sensitive |
| `cultures` | Shared templates, seeded locally from the built-ins |
| `appSettings` | A per-device preference, not shared state |

Sync is **opt-in and off by default**. It is the only part of Kalyanam that touches the
network at all.

---

## 8. Build and deployment

```mermaid
flowchart LR
    push["git push to main"] --> ci["GitHub Actions"]
    ci --> tc["tsc --noEmit"] --> t["65 tests"] --> b["next build<br/><i>static export</i>"] --> d["GitHub Pages"]
    style ci fill:#e3f2fd,stroke:#1565c0
```

Nothing deploys unless the type check and the whole test suite pass first. The output is
static files with a service worker, so the app is installable and works offline.

---

## 9. Trade-offs we accepted

| Choice | Cost | Why anyway |
| --- | --- | --- |
| No backend | Both devices must be open for *live* sync | Nobody hosts or pays for anything, and no server ever holds the family's data. Merge files cover the rest. |
| Public broker | A third party we do not control | It sees introductions only. If it disappears, merge files still work and a relay can be self-hosted — a config change, not a redesign. |
| CRDT over simple sync | More concepts, more bytes | Offline editing by several people is the normal case here, and anything simpler loses edits. |
| Dexie kept alongside Yjs | Two stores to keep in step | The entire existing UI keeps working untouched. |
| Local-first, no accounts | Clearing site data loses everything | No password, no signup, no cloud. Export regularly — the app nags about it. |

---

## 10. Reading the code

```
src/lib/db/schema.ts             18 tables, all the types
src/lib/db/hooks.ts              live queries used by every screen
src/lib/db/records.ts            which tables sync; date field maps
src/lib/sync/export-import.ts    backups (.kalyanam.json)
src/lib/sync/crdt/doc.ts         the replicated document
src/lib/sync/crdt/bridge.ts      Dexie ↔ Yjs, both directions
src/lib/sync/crdt/room.ts        room derivation and invites
src/lib/sync/crdt/peer-provider.ts  sync protocol over PeerJS
src/hooks/use-family-sync.ts     the React entry point
```

See also [SYNC-DESIGN.md](SYNC-DESIGN.md) for the decision record and
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for the design system.
