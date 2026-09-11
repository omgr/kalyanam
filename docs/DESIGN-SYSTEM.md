# Kalyanam Design System

**Owner:** Harini Amperayani — Product Owner, Product Designer & UX Designer
**Portfolio:** [harini-amperayani.com](https://harini-amperayani.com)
**Status:** v1.0 — living document
**Implementation:** Tailwind CSS + Radix primitives, tokens in `tailwind.config.ts` and `src/app/globals.css`

---

## 1. Why this product exists

Kalyanam began with a specific frustration. Planning an Indian wedding means holding several
hundred moving parts in your head at once — ceremonies whose names and order vary by community,
a guest list that lives in three WhatsApp groups, vendor advances paid in instalments, and a
dozen relatives who each hold one piece of the picture. The tools people reach for are generic
Western wedding planners that assume a single ceremony on a single day, or a spreadsheet that
nobody else can read.

The product thesis is narrow and deliberate:

> A wedding planner that already knows your rituals, keeps your family's data on your family's
> devices, and lets the people actually doing the work update it themselves.

Three constraints follow from that thesis, and every design decision in this document is
downstream of them.

| Constraint | Consequence for design |
| --- | --- |
| **Culture is the content, not a theme** | Ritual templates are first-class objects, not decoration. The UI has to make an unfamiliar ceremony name legible to a cousin who has never heard it. |
| **Local-first, no accounts** | There is no "forgot password" and no server-side truth. Onboarding must produce a usable plan in under two minutes, and destructive actions need real friction. |
| **Family, not a couple** | The primary user is often the organiser — a sibling or parent — not the bride or groom. Screens are built for delegation and hand-off, not for a single owner. |

---

## 2. Research and who we designed for

Research was conducted informally but systematically: conversations with families who had
recently married, a walkthrough of two real wedding spreadsheets, and a review of existing
planners (The Knot, WeddingWire, Zola) to find where they break for Indian weddings. The
recurring failures were consistent — a single-event model, no concept of ritual sequence, no
shared editing without an account, and budgets that assume one lump payment rather than advances
and instalments.

### Primary personas

**The Organiser** — *primary*
A sibling or parent running the wedding day to day. Comfortable with apps, time-poor, holds the
budget. Works mostly on a laptop while planning and a phone during the event week. Needs the
overview first and the detail on demand. *Every default in the product is tuned for this person.*

**The Helper** — *secondary*
An aunt, cousin or friend given three specific jobs. Low tolerance for setup. Will open the app
perhaps five times. Needs to see only what is assigned to them and mark it done without reading a
manual.

**The Couple** — *tertiary*
Consulted rather than operating. Cares about the ceremony list and the guest list. Often looking
over someone's shoulder on a phone.

### Design principles

1. **Show the whole picture before the detail.** Every module opens on a summary — counts,
   money, what is overdue — before any list. The dashboard countdown exists because "how long
   have I got" is the question behind every other question.
2. **Never lose someone's work silently.** If an action cannot complete, say so. A write that
   fails without a message is the single worst thing this product can do, because there is no
   server-side copy to recover from.
3. **Explain the ritual, don't just name it.** Every ceremony carries its local-script name, its
   significance and the items it needs. A guest who has never attended a Telugu Brahmin wedding
   should be able to read the Kashi Yatra card and understand what is happening.
4. **Respectful, not kitsch.** The palette draws on real wedding materials — turmeric, kumkum,
   gold, silk. It never uses religious iconography as ornament.
5. **Assume a bad connection and a borrowed phone.** Offline by default, generous touch targets,
   and nothing that depends on a notification arriving.

---

## 3. Foundations

### 3.1 Colour

The palette is built from materials rather than from a hue wheel. Saffron is turmeric and
marigold; vermillion is kumkum; maroon is the Kanjeevaram silk of a South Indian wedding sari;
gold is the jewellery. These are the colours of the event itself, which is why the app feels
like it belongs at a wedding rather than in a productivity suite.

#### Semantic tokens

Semantic tokens are the *only* colours a component should reference. They are declared as HSL
triplets in `globals.css` so opacity modifiers (`bg-primary/90`) work correctly, and every one
has a dark-mode counterpart.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `40 30% 98%` | `20 20% 8%` | Page ground — warm off-white, never pure `#fff` |
| `--foreground` | `20 25% 15%` | `40 20% 95%` | Body text |
| `--card` | `40 25% 96%` | `20 20% 12%` | Raised surface |
| `--primary` | `24 95% 50%` | `30 90% 55%` | Saffron. Primary actions, active nav, progress |
| `--secondary` | `340 65% 35%` | `340 50% 45%` | Maroon. Secondary emphasis, gradient partner |
| `--accent` | `45 95% 50%` | `45 85% 55%` | Gold. Highlights and hover grounds |
| `--muted` / `--muted-foreground` | `35 20% 92%` / `20 15% 45%` | `20 15% 18%` / `40 15% 65%` | Secondary text, inert grounds |
| `--destructive` | `0 85% 60%` | `0 70% 50%` | Delete and irreversible actions only |
| `--border` / `--input` / `--ring` | `35 20% 85%` / `35 20% 90%` / `= primary` | `20 15% 22%` / `20 15% 20%` / `= primary` | Edges and focus |

> **Warm neutrals are deliberate.** The greys carry a 20–40° hue. A pure neutral grey next to
> saffron reads as dirty, and the whole surface loses the candle-lit quality the palette is
> reaching for.

#### Expressive ramps

`saffron`, `vermillion`, `maroon` and `gold` ship as full 50–900 ramps for gradients, cultural
illustration and category colour. **They are not a substitute for semantic tokens** — reaching
for `bg-maroon-600` instead of `bg-secondary` breaks dark mode.

#### Status and priority

Status colour is applied as a paired background and foreground so it stays legible in both
themes, and is *always* accompanied by a text label or icon — colour never carries meaning alone.

| Status | Priority |
| --- | --- |
| `pending` amber · `confirmed` green · `declined` red · `completed` blue | `low` grey · `medium` amber · `high` orange · `urgent` red |

### 3.2 Typography

| Role | Family | Usage |
| --- | --- | --- |
| Display | **Playfair Display** (`font-display`) | Page titles, the countdown, hero. A transitional serif with high stroke contrast — it carries occasion without tipping into wedding-invitation pastiche. |
| Body / UI | **Inter** (`font-sans`) | Everything else. Chosen for its tall x-height and unambiguous numerals, which matter in a product full of dates and money. |
| Indic & Arabic | **Noto Sans Telugu / Devanagari / Arabic** | Ritual names in their own script. |

**Local script is a feature, not a fallback.** `Nischitartham` is shown alongside `నిశ్చితార్థం`
because for many families the local name is the *only* name they use. Local names render in the
primary colour at a slightly smaller size, sitting under or beside the transliteration.

Scale: `text-3xl` page titles, `text-lg` card titles, `text-sm` body/meta, `text-xs` badges.
Deliberately short — a system with four steps gets used correctly; one with nine does not.

### 3.3 Spacing, radius and elevation

- **Rhythm:** a 4px base. Section gaps `space-y-6`, intra-card `space-y-4`, tight pairs `gap-2`.
- **Radius:** `--radius: 0.75rem`. Generous and soft — the product is celebratory, and hard
  corners read as administrative. `md` and `sm` derive from it, so changing one value reshapes
  the whole product.
- **Elevation:** three levels only — flat (`border`), raised (`shadow-sm`), floating
  (`shadow-lg`, hover and modals). Depth signals interactivity, not importance.

### 3.4 Motion

Motion exists to explain *where things came from*, never to decorate.

| Token | Duration | Use |
| --- | --- | --- |
| `fade-in` | 300ms ease-out | Content arriving |
| `scale-in` | 200ms ease-out | Modals, popovers |
| `slide-in-bottom` / `-right` | 300ms ease-out | Mobile sheets, toasts |
| `shimmer` | 2s loop | Loading placeholders |
| `stagger-1…5` | +100ms each | List items, capped at five |

Lists stagger by `index * 0.05s` and cap out — beyond about five items the stagger stops reading
as choreography and starts reading as lag. Buttons use `active:scale-[0.98]`, which gives touch
the physical acknowledgement a hover state gives a cursor.

### 3.5 Cultural texture

`pattern-kolam` and `pattern-paisley` are SVG tiles at 3–5% opacity. Kolam is the threshold
floor-drawing that marks an auspicious space; it appears on the landing hero and onboarding —
thresholds into the product. At full strength it would be costume. At 5% it is a texture you
feel rather than see.

---

## 4. Components

Built on Radix primitives so keyboard behaviour, focus trapping and ARIA wiring are correct by
construction, then styled with `class-variance-authority` so every variant is a typed, explicit
choice rather than an ad-hoc class string.

### Button

| Variant | When |
| --- | --- |
| `default` | The one primary action on a screen |
| `outline` | Secondary actions, filters |
| `ghost` | Tertiary, toolbar, back links |
| `secondary` | Maroon emphasis, used sparingly |
| `destructive` | Delete only — and always behind a confirmation |
| `link` | Inline navigation |
| `gradient` | Reserved for the single highest-intent CTA per page |

Sizes `sm` (36px) → `default` (40px) → `lg` (44px) → `xl` (56px, hero) → `icon`. **On mobile,
anything tappable is at least 44px.** People use this one-handed, standing up, at a venue.

### Card
The primary container. Header / content / footer, `rounded-lg`, `border`. Interactive cards add
`cursor-pointer hover:shadow-lg transition-shadow` — hover elevation is the affordance that says
"this opens".

### Progress
Checklist and budget progress use a 2px track with a `bg-primary` fill and `transition-all`.
Always paired with the raw numbers (`12/20`) — a bar alone tells you nothing actionable.

### Toast
Three variants: `default`, `success`, `destructive`. **Every failed write must raise a
destructive toast.** This is a system rule, not a suggestion — see principle 2.

### Empty states
Never a bare "no data". Every empty state carries an icon, a plain-language explanation, and the
button that resolves it. The empty state *is* the onboarding for that module.

---

## 5. Layout and navigation

A persistent 256px sidebar on desktop (≥1024px), collapsing to a slide-in drawer with a bottom
tab bar on mobile. Content gets `pb-20` on mobile so the bottom bar never covers the last row.

Navigation is flat — eleven destinations, no nesting. The organiser moves between budget, tasks
and guests constantly; a hierarchy would add a tap to every transition. Eleven is at the edge of
comfortable, and it is a deliberate ceiling: **a twelfth module means something else has to
merge or go.**

Breakpoints: `sm 640` · `md 768` · `lg 1024` (sidebar appears) · `xl 1280` · `2xl 1400`.

---

## 6. Accessibility

Target: **WCAG 2.1 AA**.

- All semantic pairings meet 4.5:1 for body text and 3:1 for large text. The status/priority
  pairs were chosen for contrast in *both* themes, which is why they specify explicit dark-mode
  foregrounds rather than relying on opacity.
- Colour is never the sole carrier of meaning — status has a label, priority has an icon,
  overdue has both a red border and the word "overdue".
- Focus is visible everywhere: `focus-visible:ring-2 ring-ring ring-offset-2`.
- Radix gives us correct roles, labelling and Escape/Tab behaviour in dialogs and menus.
- Every input has a real `<label htmlFor>`, not a placeholder pretending to be one.
- Dark mode is a genuine re-specification of every token, not a filter.

### Known gaps

Honest list, carried forward:

- Reduced-motion preferences are not yet respected; `prefers-reduced-motion` should disable
  stagger and shimmer.
- Some icon-only buttons (checklist delete, task status toggle) still need `aria-label`.
- The checklist delete control only appears on hover, which makes it unreachable by touch —
  it needs to be persistently visible on coarse pointers.
- Colour contrast has been reasoned about but not yet verified with an automated audit.

---

## 7. Design process

The process followed for this product, and the one to follow for anything added to it:

1. **Understand** — talk to families who have just been through it; read the real spreadsheets.
2. **Frame** — write the job to be done from the organiser's point of view.
3. **Structure** — information architecture and user flows before any pixels.
4. **Wireframe** — low fidelity in Figma, resolving hierarchy and density.
5. **Prototype** — high fidelity, interactive, both breakpoints.
6. **Test** — usability sessions against real wedding data. Watch, do not prompt.
7. **Iterate** — fix what the sessions surfaced, then re-test.
8. **Document** — fold decisions back into this file so they survive the project.

### Validation

The system was exercised against a real wedding — 20 ceremonies from Nischitartham through
Muhurtham, a 16-category budget, and a live guest list — rather than against invented content.
Template data that survives contact with a real family is the only kind worth shipping. UAT was
run on that same real plan.

---

## 8. Contributing to this system

1. **Semantic tokens only.** If you write a hex code or reach for an expressive ramp where a
   semantic token exists, dark mode breaks.
2. **Extend the component, don't fork it.** New need → new `cva` variant, not a bespoke button.
3. **Every state, every time.** Default, hover, focus-visible, active, disabled, loading, error,
   empty. A component without an empty state is unfinished.
4. **Both themes before review.** Light and dark, at 375px and 1440px.
5. **Every failure is visible.** No silent catch. Ever.

---

*Maintained by Harini Amperayani. Raise design questions as GitHub issues labelled `design`.*
