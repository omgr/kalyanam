# Connecting the Family's Devices

How to get two or more phones, tablets or laptops sharing one wedding — what you need,
what keeps it working, and who can and cannot join.

---

## What you need

| | |
| --- | --- |
| **A modern browser** | Chrome, Edge, Safari or Firefox, kept up to date. Works on Android, iPhone, Mac, Windows. |
| **Internet on both devices** | Mobile data or wifi. Needed to introduce the devices to each other — see [How it connects](#how-it-connects). |
| **Both devices open at the same time** | For a *live* connection. If that is impossible, use a [merge file](#when-you-cannot-both-be-online) instead. |
| **Up to 8 devices** | Per wedding. More than that and the newest device is turned away. |

You do **not** need: an account, a password, a phone number, an app store, or for the
devices to be on the same wifi.

---

## Connecting a second device

**On the device that already has the wedding**

1. Open **Sync & Backup** from the menu.
2. Under **Family Sync**, tap **Turn on Family Sync**.
3. Wait until it says *Waiting for family*. You will see a **QR code** and an **invite code**.

**On the new device**

4. Open the same website: `https://omgr.github.io/kalyanam/`
5. Tap **Login / Sync** → **Join with Family Sync**.
6. Scan the QR code, or paste the invite code, and tap **Join**.
7. Within a few seconds the whole wedding arrives — every ceremony, guest, task and expense.
8. When asked **"Who is using this device?"**, pick yourself from the family list, or add
   yourself if you are not on it yet.

> **Step 8 matters.** It is how everyone else sees who sent a message and who is where during
> the events. Skip it and the app cannot tell your phone from anyone else's.

Repeat for each additional device. Any connected device can invite the next one.

---

## Staying in sync

Once connected, changes flow **automatically**. Edit a ceremony time on your phone and it
appears on your mother's within seconds, with no button to press.

If two people edit at the same time, **both edits are kept**. Change a ceremony's time while
someone else changes its venue and you end up with both, not a fight over whose save landed
last. Even edits made with no signal at all merge correctly once the devices meet again.

### Does it work in the background?

**Honestly: not reliably, and you should not depend on it.**

Phones aggressively suspend background tabs and apps to save battery. When Kalyanam is in the
background or the screen is off, the connection usually drops within a minute or two.

**What this means in practice:**

- Sync happens when the app is **open and on screen**.
- Nothing is lost while it is closed. Your edits are saved on your own device immediately, and
  they sync the next time both devices are open together.
- Opening the app and leaving it on screen for ten seconds is enough to catch up.

A good habit during the wedding week: open Kalyanam for a moment when you pick up your phone.
That is all it takes.

### Does it need mobile data?

Yes — some, and very little.

- **To connect:** both devices need internet, to find each other.
- **After connecting:** if both are on the same wifi, the data goes directly across that wifi.
  On different networks it travels over the internet between the two phones.
- **How much:** a whole wedding is a few hundred kilobytes. An individual change is a few
  hundred bytes. This will not dent anyone's data allowance.

### What if there is no signal at the venue?

Everything keeps working. Kalyanam is offline-first: the whole plan lives on your own device,
so you can read and edit it with no connection at all. Changes queue up and merge when you are
back online.

If the venue wifi is unusable all day, use a [merge file](#when-you-cannot-both-be-online).

---

## When you cannot both be online

Sometimes two people are simply never awake and online together. That case is covered.

**On the device with the newer changes:** Sync & Backup → Family Sync → **Save** under
*Merge file*. Send the file however you like — WhatsApp, email, AirDrop.

**On the other device:** Sync & Backup → Family Sync → **Apply**, and pick the file.

A merge file is **not** a backup. A backup replaces what is there; a merge file **combines**
both sides, keeping everyone's edits. Applying the same file twice is harmless, and it does not
matter which order files arrive in.

| | Backup (`.kalyanam.json`) | Merge file (`.kmerge`) |
| --- | --- | --- |
| Effect | Replaces everything | Combines both sides |
| Applying twice | Refused as a duplicate | Harmless |
| Use for | Safekeeping, a brand new device | Keeping two devices in step |

---

## How it connects

Two phones on different networks cannot simply find each other — neither has a public address.
Kalyanam solves this the same way video calls do:

1. **Introduction.** Both devices check in with a small public service (the PeerJS broker) which
   passes connection details between them. It learns that two anonymous ids want to talk. **It
   never sees your wedding data.**
2. **Finding a route.** Each device asks a public STUN server what its address looks like from
   the outside, then the two connect directly.
3. **The data.** Everything travels **straight between the two devices**, encrypted. It does not
   pass through any server, and no copy is stored anywhere.

There is no Kalyanam server. Nobody — including whoever built this — can read your wedding.

For the full technical picture, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## How only family can connect

Reasonable question, since there is no login.

**The invite code is the key.** Every wedding gets a long random secret, generated on your device
and never sent anywhere. The "room" your devices meet in is named by a SHA-256 fingerprint of
that secret combined with the wedding id. Without the secret the room name cannot be worked out
or guessed — there is nothing to brute-force, and nothing public that hints at it.

**What that means:**

| Situation | Can they get in? |
| --- | --- |
| A stranger who finds the website | **No.** They have no invite, so no room. |
| Someone who gets your exported backup file | **No.** A backup has the wedding id but not the room secret. |
| Someone who guesses | **No.** It is a 128-bit secret. |
| The PeerJS broker operator | **No.** They see anonymous ids, not data. |
| Anyone you send the invite code to | **Yes — fully.** Read and write. |

> ### Treat the invite code like a house key
> Anyone holding it can read *and change* the whole wedding, including the budget. Send it
> directly to the person who needs it. Do not post it in a large group chat, and do not put it
> anywhere public.

**If a code gets out:** turn off Family Sync on your device, then turn it on again on a device
that still has the wedding — but note this is not yet a one-click "revoke". If this happens,
the surest fix is to export a backup, clear the data, and re-import it, which produces a new
wedding id and therefore a new room. Raise an issue if you need this and we will make it a
button.

### What is deliberately not shared

Some things stay on your own device and never sync: your exact GPS history, and your app
preferences like dark mode. Your *current area* at the venue is shared, but only when you
choose to share it, and only if you have turned it on.

---

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Stuck on *Waiting for family* | Nobody else has the app open. Ask them to open it and leave it on screen. |
| *Could not connect* | Some corporate and public wifi blocks peer-to-peer traffic. Try mobile data, or use a merge file. |
| Joined but no data arrived | The other device went to sleep mid-transfer. Open both, leave them on screen for ten seconds. |
| Changes not appearing | Check the sidebar indicator says *N devices*. If it says *Waiting*, you are not connected. |
| Says *Not supported here* | A very old browser, or a private/incognito window. Use a normal window. |
| Wrong person's name on messages | Someone skipped step 8. Go to **Find Family** and pick the right person. |

The **sidebar indicator** always tells you the truth: *Sync off*, *Connecting*, *Waiting for
family*, or *N devices*.

---

## Removing a device

Turn off Family Sync on that device (Sync & Backup → **Turn off Family Sync**). It keeps its own
copy of the wedding but stops sending and receiving. To wipe it completely, use **Logout** and
then clear the browser's site data.

---

## Sending the invitation to everyone

A separate question from syncing devices, and worth being straight about: **no website can
send WhatsApp messages on your behalf.** There is no client-side API for it. The official
Cloud API needs a business account, a server and per-message fees, and the "bulk sender" tools
that claim otherwise are either paid gateways or unofficial automation that gets numbers
banned. Kalyanam will not do that to your number.

What it does instead, all free, on **Guests → Invitation**:

| Route | Reaches | Notes |
| --- | --- | --- |
| **Share card to WhatsApp** | As many as you like | Opens your phone's share sheet with the card and wording attached. Pick WhatsApp, then **tick multiple chats** before sending — the multi-select is WhatsApp's own. |
| **Broadcast list** | 256 per list | Copy the numbers, then WhatsApp → ⋮ → New broadcast. Everyone receives a normal private message, not a group. Only reaches people who have **your number saved** — usually true for family. |
| **Email everyone** | All at once | Opens your mail app with every address in BCC, so no guest sees another's. |
| **One at a time** | Per household | Personalised with each guest's name. Families are grouped so a household gets one invitation, not five. |

The share sheet route is the one to reach for first on Android. Attaching the image is
manual in every route, because no website is permitted to attach files to your messages.
