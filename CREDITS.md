# Credits

Kalyanam (కళ్యాణం) was built by two people. It started as a way to plan one family wedding and
was deliberately shaped so that anyone else could use it too.

---

## Harini Amperayani — Product Owner · Product Designer · UX Designer · UAT

**Portfolio:** [harini-amperayani.com](https://harini-amperayani.com) · **GitHub:** [@HariniAmperayani](https://github.com/HariniAmperayani)

**The original idea for Kalyanam was Harini's.** She owned the product from concept through
validation and defined what it should be before any code existed.

### Product ownership
- Originated the product concept and its central thesis: a wedding planner that already knows
  your rituals, keeps family data on family devices, and lets the people doing the work update
  it themselves.
- Defined the problem space — existing planners assume a single Western ceremony, no ritual
  sequence, no shared editing without an account, and budgets with no concept of advances or
  instalments.
- Set the product constraints that shaped the whole architecture: culture as content rather
  than theme, local-first with no accounts, and the family (not the couple) as the primary user.
- Owned scope and prioritisation across the module set — events, guests, budget, vendors, tasks,
  family, messages, reminders and location.

### UX research and product design
- Conducted user research with families who had recently married, reviewed real wedding
  spreadsheets, and ran a competitor analysis across mainstream wedding planners.
- Developed the persona model — the Organiser (primary), the Helper, the Couple — and the
  design principles that follow from it.
- Defined information architecture and user flows, including the onboarding path that has to
  produce a usable plan in under two minutes without an account.
- Established the ritual template model as a first-class product object, including the decision
  to carry local-script names, significance and required items for every ceremony.

### UI design and design system
- Authored the Kalyanam design system end to end — documented in
  [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).
- Built the material-derived colour palette (turmeric saffron, kumkum vermillion, Kanjeevaram
  maroon, jewellery gold) and its full semantic token set across light and dark themes.
- Set the type system, including multi-script support for Telugu, Devanagari and Arabic so
  ritual names render in their own script.
- Specified the component library, motion language, cultural texture treatment, and the
  responsive layout model.
- Set the accessibility target (WCAG 2.1 AA) and documented the outstanding gaps honestly rather
  than quietly.

### Validation and UAT
- Ran usability testing and iterated the designs across multiple rounds.
- Performed user acceptance testing against a real wedding plan — 20 ceremonies, a 16-category
  budget and a live guest list — rather than invented test content.

---

## Madan Gopal Ongole — Engineering

**LinkedIn:** [ongolemadangopal](https://www.linkedin.com/in/ongolemadangopal/) · **GitHub:** [@omgr](https://github.com/omgr)

- Application architecture and full implementation: Next.js App Router, TypeScript, Dexie over
  IndexedDB, Tailwind, Radix.
- Local-first data layer, schema and reactive query hooks.
- Export, import and device-to-device sync.
- PWA and Capacitor mobile packaging.
- Build, static export and GitHub Pages deployment.

---

## Cultural content

Ritual templates for Telugu Brahmin, South Indian, North Indian, Muslim (Nikah) and Christian
weddings were compiled with family input and reviewed for accuracy of sequence, naming and
significance. Corrections are welcome — open an issue if a ceremony in your tradition is missing
or misdescribed.

---

*If you use or fork Kalyanam, please keep this attribution intact.*
