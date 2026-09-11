# Family Sync — Design

**Status:** steps 1-3 implemented and verified device-to-device; steps 4-5 outstanding
**Target:** working before the December 2026 wedding
**Decision:** CRDT (Yjs) over PeerJS, with merge files as the offline fallback
**Transport note:** the relay is PeerJS, not y-webrtc - every public y-webrtc signalling server proved to be dead

---

## 1. The problem

Today there is exactly one way to move data between devices that actually works: export a file
and hand it over. The "6-character sync code" flow advertised in the README cannot work across
devices at all.

`src/lib/sync/webrtc.ts` signals over `BroadcastChannel` plus a `localStorage` polling loop.
Both are scoped to a single browser profile on a single machine. The file's own comment admits
it: *"In production, you'd want a proper signaling server."* There is a real PeerJS
implementation in `src/lib/sync/family-room-connection.ts`, but no page imports it — it is dead
code.

So the sync code appears to work when you test it in two tabs, and silently fails the moment two
actual phones are involved.

## 2. The constraint, stated honestly

We want no backend to host or maintain. That rules out a server of our own holding the data.

But two browsers on different networks **cannot discover each other unaided**. WebRTC needs a
rendezvous point to exchange connection offers — there is no way around this in a browser. The
question is not *whether* there is a third party, but *what it sees* and *what happens when it
is down*.

The design below uses a public signalling relay that:

- sees only connection offers, never wedding data;
- is not operated by us and costs nothing;
- is replaceable by a one-line config change if it disappears.

Actual wedding data travels **peer to peer, encrypted**, and never touches the relay.

## 3. Why a CRDT

Two people will edit the same plan while offline — that is the normal case at a wedding, not the
edge case. Mum marks a task done on the venue's terrible wifi; you change the Muhurtham start
time on 4G. Both devices then reconnect.

A naive "last sync wins" merge loses one of those edits. A CRDT (Conflict-free Replicated Data
Type) merges them deterministically, in any order, with no central referee:

- Every device holds the full document and applies changes locally, offline, immediately.
- Changes carry enough metadata to merge in any order and still converge on the same result.
- No "who won" prompt, no lost edit, no server needed to arbitrate.

**The CRDT is the important half of this design.** It makes merging correct independently of the
transport, which means the relay can be swapped, supplemented or removed later without
redesigning anything. Adding self-hosting on the homelab later becomes a transport change, not a
rewrite.

We use **Yjs** — mature, small, with ready-made IndexedDB persistence and WebRTC transport.

## 4. Architecture

```
   Phone A                        Phone B
 ┌──────────┐                  ┌──────────┐
 │  React   │                  │  React   │
 │    ↕     │                  │    ↕     │
 │  Dexie   │  ← projection →  │  Dexie   │   (queries, hooks, all existing UI)
 │    ↕     │                  │    ↕     │
 │ Yjs doc  │                  │ Yjs doc  │   (source of truth for synced state)
 │    ↕     │                  │    ↕     │
 │y-indexeddb│                 │y-indexeddb│  (survives reload, works offline)
 └────┬─────┘                  └─────┬────┘
      │      encrypted WebRTC        │
      └──────────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        │  public signalling relay │   offers only - never sees wedding data
        └──────────────────────────┘
```

**Dexie stays.** Every hook, query and screen keeps working against Dexie exactly as now. The
Yjs document becomes the synced source of truth, and a thin bridge projects it into Dexie so the
UI never has to know sync exists. This keeps the change contained and avoids touching 12,000
lines of working UI.

### Document shape

One Yjs document per wedding. Inside it, one `Y.Map` per collection, keyed by record id:

```
wedding          Y.Map  (a single record's fields)
events           Y.Map<eventId,    Y.Map<field, value>>
tasks            Y.Map<taskId,     Y.Map<field, value>>
guests           Y.Map<guestId,    Y.Map<field, value>>
expenses         Y.Map<expenseId,  Y.Map<field, value>>
budgetCategories Y.Map<...>
vendors          Y.Map<...>
familyMembers    Y.Map<...>
reminders        Y.Map<...>
```

Records are nested `Y.Map`s rather than plain objects so merges happen **per field**. If you
change an event's time while someone else changes its venue, both survive. If the record were a
single opaque value, one edit would clobber the other.

### What is not synced

`messages`, `locationPings` and `locationRequests` stay local. Location is ephemeral and
privacy-sensitive; messages duplicate what the family already does in WhatsApp. Syncing them
costs bandwidth and risk for no real gain.

### Deletions

Deleting a key from a `Y.Map` is itself a CRDT operation, so deletes propagate correctly. We do
**not** need manual tombstones. Deletes are, however, irreversible across all devices — so
destructive actions keep their confirmation dialogs, and delete of a whole wedding stays a
local-only operation that never propagates.

### Identity and rooms

- Room name: `kalyanam-<weddingId>` — unguessable, since wedding ids are UUIDs.
- Room password: a secret derived per wedding and shared out of band, exactly like today's
  6-character code. y-webrtc encrypts all traffic with it, so the relay sees ciphertext.
- The existing `kalyanam_user_id` (now reliably established by `src/lib/session.ts`) identifies
  who made a change, for display only — it is not used for conflict resolution.

### Joining

The existing "sync code" UI is kept, with the transport replaced:

1. Device A shows a short code (or QR) encoding the wedding id plus the room secret.
2. Device B enters or scans it, joins the room, and the CRDTs converge.
3. Both devices persist to `y-indexeddb` and reconnect automatically from then on.

## 5. Migration

Existing weddings must not be disturbed.

1. On first run after the update, if a wedding exists in Dexie but no Yjs document does, seed the
   document from Dexie inside one transaction.
2. From then on, Dexie is written *through* the bridge rather than directly.
3. Export/import keeps working unchanged — it already round-trips the Dexie shape, and remains
   the fallback for a device that cannot reach the relay.

## 6. Risks and what we do about them

| Risk | Mitigation |
| --- | --- |
| The public relay is down or disappears | Configure a list of relays and fall back through it. File and QR transfer always work. Self-hosting on the existing homelab is a config change, not a rewrite. |
| Both devices must be open at once | True for live sync. Async hand-off stays covered by file/QR export. If this proves painful, a relay on the homelab (which the infrastructure already exists for) removes the limitation. |
| WebRTC blocked on a venue network | Detect and surface it plainly, and fall back to QR — which needs no network at all. |
| CRDT document grows over time | A wedding is a few thousand records at most. Yjs handles this comfortably; compact on export if it ever matters. |
| A device rejoins with very stale state | This is exactly what CRDTs are for. It converges. |

## 7. Implementation plan

Sequenced so each step is independently useful and testable.

1. **Bridge, no network.** Add Yjs and `y-indexeddb`. Build the Dexie↔Yjs projection and the
   migration. Ship it with no transport at all — behaviour is identical to today, but the data
   model is ready. *Verify: all 32 existing tests plus new bridge tests pass; the app behaves
   exactly as before.*
2. **Two tabs.** Enable Yjs sync over `BroadcastChannel` only. Proves convergence with zero
   network risk. *Verify: edits in one tab appear in the other; conflicting offline edits merge.*
3. **Two devices.** Add `y-webrtc` with the relay list and room encryption. Rework the existing
   sync-code screen onto it. *Verify: two real phones on different networks, including one
   editing while offline.*
4. **Harden.** Connection state in the UI, explicit "last synced" indicator, relay fallback,
   and a plain-language explanation when peer-to-peer cannot be established.
5. **Rehearse.** A full dry run in November with the actual family devices, on a network like the
   venue's — not on home wifi.

## 8. What would change this decision

If step 3 proves unreliable across the family's real devices and networks, the fallback is a
minimal relay on the existing homelab (Proxmox, behind the existing WireGuard setup). That is
strictly more work to maintain, but it removes both the third-party dependency and the
both-online-at-once constraint. The CRDT work in steps 1 and 2 is unaffected either way — which
is the point of doing it first.
