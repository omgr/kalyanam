# Notifications — what is possible, and what is not

Short version: **Kalyanam can notify you while the app is open. It cannot wake a closed app,
and that is not a missing feature — it is a wall.** This explains the wall, because the
workaround people reach for is worse than the limitation.

---

## What works today

| | Works | Needs |
| --- | --- | --- |
| Notification when a message arrives, app open | ✅ | Permission, granted once |
| Notification while the app is backgrounded but alive | ✅ usually | Raised via the service worker |
| Unread count on the installed app's icon | ✅ | App installed to the home screen |
| Unread badge in the app's own navigation | ✅ | — |
| **Notification when the app is fully closed** | ❌ | **A relay server** |

---

## Why a closed app cannot be woken

Real push — the kind that reaches a phone with the app shut — uses the Web Push protocol. The
sender encrypts a payload and POSTs it to a push endpoint belonging to the recipient's browser
vendor. The browser vendor then wakes the device.

It is genuinely possible to do that encryption in a browser: RFC 8291 needs ECDH on P-256,
HKDF and AES-128-GCM, and WebCrypto provides all three. VAPID signing is an ES256 JWT, also
available. So in principle one family member's phone could push directly to another's, with no
server anywhere.

**In practice the push services refuse the request.** A browser POST is subject to CORS, and
the endpoints do not allow it:

```
fcm.googleapis.com                 (Chrome)   allow-origin: none      ← blocked
web.push.apple.com                 (Safari)   allow-origin: none      ← blocked
updates.push.services.mozilla.com  (Firefox)  allow-origin: allowed   ← would work
```

Only Firefox permits it. Every Android phone and every iPhone goes through Google or Apple,
both of which refuse. This was tested rather than assumed.

So peer-to-peer push is not available to this app's users, and no amount of client-side
cleverness changes it.

---

## What a relay would take, if it is ever wanted

The missing piece is small and holds nothing: a service that accepts an already-encrypted
payload and forwards it to the push endpoint. It cannot read the message — encryption happens
on the sending phone, using keys only the recipient's browser holds.

Roughly thirty lines on a free serverless tier. It would need to exist somewhere reachable,
which is the thing this project has deliberately avoided, so it is written down as an option
rather than built:

- **For:** genuine notifications on a closed app, which is what people expect of a chat.
- **Against:** something to keep alive, and the first component that could fail while nobody is
  watching. A relay in the wrong region also adds latency to every notification.
- **Note:** it would need to be near the wedding rather than near whoever maintains it.

Until then, the honest position is the one the app states: **anything that genuinely cannot
wait deserves a phone call.** Kalyanam is where the plan and the conversation about it live,
not a pager.

---

## Using what is there

1. Open Chat and tap **Turn on alerts** once per device.
2. **Install the app** to the home screen — this is what enables the count on the icon, which
   survives backgrounding in a way a notification does not.
3. Expect to open the app to catch up. Opening it for a few seconds syncs everything and
   clears the badge.
