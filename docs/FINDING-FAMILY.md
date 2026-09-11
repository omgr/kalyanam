# Messages & Finding Family

Two features for the days when the wedding is actually happening and everyone is spread
across a large venue.

---

## Before either works

Both depend on knowing **which family member is using which device**. You are asked once,
on the **Find Family** screen:

> **Who is using this device?** → pick yourself, or tap *I'm not on the list* to add yourself.

Everyone who joins should do this on their own phone. Without it the app cannot tell one
device from another, so messages show the wrong sender and a shared location is attributed
to the wrong person.

You also need [Family Sync connected](CONNECTING-DEVICES.md) — these are the two features
that are meaningless on a single device.

---

## Messages

A shared noticeboard for the wedding, separate from the family WhatsApp group so that
"the priest wants everyone at 5:30" does not get buried under photographs.

### Sending

**Messages** → **New Message**

| Field | Notes |
| --- | --- |
| **Type** | *Message* for normal chat · *Announcement* for everyone · *Reminder* for time-sensitive · *Alert* for urgent |
| **Priority** | Normal · Important · Urgent |
| **To** | Leave empty for everyone, or pick specific family members |
| **Subject** | Optional |
| **Content** | The message itself |

Messages appear on every connected device within seconds, and show who sent them and when.
You can see who has read each one.

### When they arrive

Same rules as everything else: while the app is open. A message sent while your mother's
phone is in her handbag arrives when she next opens Kalyanam. **For genuinely urgent things
— "we are starting now" — ring the person.** This is a noticeboard, not a pager.

---

## Finding Family

During a big wedding the recurring question is *"where is Mama?"*. There are two ways to
answer it, and the less obvious one is more useful.

### Venue areas — the one that actually works indoors

GPS cannot tell the dining hall from the mandapam one floor above it. Naming the parts of
the venue and checking in is far more precise, and it costs no battery.

**Setting the venue up — do this once, before the wedding**

1. Go to **Find Family** → **Venue Areas**.
2. Tap *Add common wedding areas*, or type your own: `Upstairs Mandapam`, `Dining Hall`,
   `Bride's Room`, `Car Park`.
3. **Walk round the venue once and tap the crosshair beside each area while standing in it.**
   That pins the area to where it actually is. A pinned area turns green.
4. That is all. The list *and* the pins sync to every family device automatically.

### Automatic tracking — so nobody has to keep checking in

Once areas are pinned, turn on **Track my area automatically**. Your phone then works out
which area you are in as you move, and updates it for everyone without you touching anything.

**How it manages that without beacons:** GPS indoors is only accurate to 15–50 metres, which
sounds far too coarse. But the error is *consistent* — two readings taken at the same venue
minutes apart are wrong in the same direction by about the same amount. So instead of
comparing your position against a map, the app compares it against the pins you captured at
that same venue. Relative comparison is much more reliable than the raw accuracy suggests.

It also refuses to flip back and forth: a new area has to be at least 10 metres closer than
your current one before it reports a move, so standing on a boundary does not make you appear
to bounce between two rooms.

**What it cannot do**

- **Floors.** Two areas stacked above each other are the same point to GPS. Give them one
  shared area name, or check in by hand.
- **Work with the screen off.** Phones suspend background tabs to save battery. No web app can
  track anyone while it is closed — this runs while Kalyanam is on screen.
- **Anything without a pin.** Unpinned areas stay pickable by hand.

**Checking in by hand** is still there for anywhere GPS cannot help: pick your area under
**Your Location** and tap Share.

**Finding someone**

The **Family Members** list shows each person with their current area and when they last
updated. **Venue Areas** shows the reverse — each area and how many people are in it, which
is how you spot that everyone has drifted to the dining hall.

### GPS — for distance, not for indoors

Sharing your location also captures GPS coordinates, which are useful for *"has Uncle left
the hotel yet?"* rather than *"which room is he in?"*. Accuracy is shown honestly
(excellent / good / fair / weak) — indoors it is usually fair or weak, which is exactly why
venue areas exist.

### Privacy

- **Sharing is always a deliberate act.** Nothing is shared until you tap Share Location, and
  nothing is tracked continuously — there is no background tracking, and the app cannot follow
  you when it is closed.
- **Your location goes only to family devices**, directly, encrypted. No server sees it.
- **Your GPS history never syncs.** Only your current area and last position are shared.
- **Stop any time** by simply not sharing again. Your last position stays visible until
  someone else updates theirs, so during the event update yours when you move, and stop
  sharing when the wedding is over.

---

## A realistic wedding-day pattern

**The week before**
- Everyone joins and picks who they are.
- One person sets up the venue areas.
- Post the day's running order as an *Announcement*.

**On the day**
- Check in to an area when you move somewhere new.
- Use *Alert* priority only for things that genuinely cannot wait.
- Expect to open the app to catch up — it is not a live tracker.

**What this is not**
- Not a live map that updates while your phone is in your pocket.
- Not a replacement for ringing someone when it is urgent.
- Not continuous tracking — every update is someone choosing to share.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Messages show the wrong sender | That device skipped *Who is using this device?* Fix it on **Find Family**. |
| "Tell us who you are first" | Same — pick yourself before sharing a location. |
| Family list shows nobody's location | Nobody has shared yet, or you are not connected. Check the sidebar indicator. |
| Only generic areas listed | No venue areas defined yet. Add them under **Venue Areas**. |
| Location says *weak* | Normal indoors. Use venue areas instead. |
| Browser refuses location | Permission was denied. Re-enable it in site settings, or just use venue areas — they need no GPS at all. |
| Someone's area is out of date | They have not checked in since moving. It shows the time of their last update. |
