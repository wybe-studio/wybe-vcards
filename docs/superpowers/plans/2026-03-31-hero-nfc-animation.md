# Hero NFC Tap Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated NFC card tap simulation to the marketing hero section that reveals a miniaturized vCard replica inside a stylized smartphone.

**Architecture:** Single new client component (`HeroVcardAnimation`) containing a CSS smartphone frame, a floating NFC card, and a static mini vCard replica. Motion library orchestrates a one-shot tap→reveal sequence triggered on scroll. The existing `HeroSection` gets a two-column grid layout to place the animation alongside the current text content.

**Tech Stack:** motion (framer-motion v12), lucide-react, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-31-hero-nfc-animation-design.md`

---

### Task 1: Create the static mini vCard replica

**Files:**
- Create: `components/marketing/hero-vcard-animation.tsx`

This task builds the static visual elements — no animation yet. We'll add animation in Task 3.

- [ ] **Step 1: Create the component with smartphone frame and mini vCard**

```tsx
"use client";

import { Linkedin, Mail, Nfc, Phone, Smartphone, UserPlus } from "lucide-react";

// -- Static mini vCard (fake data) --------------------------------------------------

function MiniVcard() {
  return (
    <div className="h-full w-full origin-top-left overflow-hidden">
      {/* Header */}
      <div
        className="relative h-[140px] overflow-hidden px-3 pt-3"
        style={{ backgroundColor: "#1e293b" }}
      >
        {/* Fake logo placeholder */}
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-white/20" />
        </div>
        {/* Name + title */}
        <div className="flex flex-col">
          <h3 className="mb-1 text-lg font-bold text-white">Marco Rossi</h3>
          <p className="text-[10px] uppercase text-white/60">Sales Manager</p>
        </div>
        {/* Avatar */}
        <div className="absolute -right-2 bottom-0 z-[2]">
          <div className="flex size-[72px] items-center justify-center rounded-full border-2 border-white bg-slate-600 text-sm font-bold text-white">
            MR
          </div>
        </div>
        {/* Diagonal cut (like real vcard) */}
        <div
          className="pointer-events-none absolute -bottom-3 -left-4 h-[50px] w-[200%] -rotate-6"
          style={{ backgroundColor: "#f1f5f9" }}
        />
      </div>

      {/* Tabs */}
      <div className="flex" style={{ backgroundColor: "#f1f5f9" }}>
        <div className="flex-1 border-b-2 border-slate-800 py-2 text-center text-[10px] font-medium">
          Contatti
        </div>
        <div className="flex-1 py-2 text-center text-[10px] text-muted-foreground">
          Azienda
        </div>
      </div>

      {/* Contact list */}
      <div className="flex flex-col bg-white">
        <MiniContactRow icon={<Smartphone className="size-3.5" />} value="+39 348 123 4567" label="Mobile" />
        <div className="mx-3 border-b" />
        <MiniContactRow icon={<Mail className="size-3.5" />} value="m.rossi@acme.it" label="Email" />
        <div className="mx-3 border-b" />
        <MiniContactRow icon={<Linkedin className="size-3.5" />} value="linkedin.com/in/mrossi" label="LinkedIn" />
      </div>

      {/* Add contact button */}
      <div className="flex items-center justify-center bg-white px-3 py-3">
        <div
          className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[10px] font-medium text-white"
          style={{ backgroundColor: "#1e293b" }}
        >
          <UserPlus className="size-3" />
          Aggiungi contatto
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center bg-neutral-900 py-2">
        <p className="text-[8px] text-white/60">
          Powered by <span className="text-white/40">Wybe</span>
        </p>
      </div>
    </div>
  );
}

function MiniContactRow({
  icon,
  value,
  label,
}: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex size-6 items-center justify-center text-blue-500">
        {icon}
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className="truncate text-[10px] font-medium">{value}</p>
        <p className="text-[8px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// -- Smartphone + NFC card frame ----------------------------------------------------

export function HeroVcardAnimation() {
  return (
    <div className="relative flex items-center justify-center py-8">
      {/* Scene container with perspective */}
      <div className="relative" style={{ perspective: "800px" }}>
        {/* Smartphone */}
        <div className="relative h-[450px] w-[220px] overflow-hidden rounded-[2.5rem] border border-neutral-200 bg-neutral-950 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35),0_10px_25px_-8px_rgba(0,0,0,0.2)] lg:h-[500px] lg:w-[245px]">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2 z-20 h-[14px] w-[60px] -translate-x-1/2 rounded-full bg-black" />

          {/* Screen area */}
          <div className="absolute inset-[6px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900">
            {/* vCard content — initially hidden, revealed by animation */}
            <div className="h-full w-full opacity-0" id="hero-vcard-screen">
              <MiniVcard />
            </div>
          </div>
        </div>

        {/* NFC Card */}
        <div className="absolute -right-8 -top-4 z-10 flex h-[65px] w-[100px] items-center justify-center rounded-xl border border-neutral-100 bg-white shadow-[0_20px_40px_-8px_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(0,0,0,0.1)]">
          <Nfc className="size-7 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders by temporarily importing in hero section**

Temporarily add to `components/marketing/sections/hero-section.tsx` just to visually check:

```tsx
// At top of file
import { HeroVcardAnimation } from "../hero-vcard-animation";

// Inside the section, after the CTA buttons div (line ~77):
<HeroVcardAnimation />
```

Run: `npm run dev` and check `http://localhost:3000` — you should see the smartphone with NFC card and a dark screen.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/hero-vcard-animation.tsx components/marketing/sections/hero-section.tsx
git commit -m "feat: add static hero vCard animation component with smartphone and NFC card"
```

---

### Task 2: Add Motion animation sequence

**Files:**
- Modify: `components/marketing/hero-vcard-animation.tsx`

- [ ] **Step 1: Add motion imports and animation controls**

Replace the entire `HeroVcardAnimation` function in `components/marketing/hero-vcard-animation.tsx` with the animated version. The `MiniVcard` and `MiniContactRow` stay unchanged.

```tsx
import { motion, useAnimation } from "motion/react";

export function HeroVcardAnimation() {
  const nfcControls = useAnimation();
  const screenControls = useAnimation();
  const rippleControls = useAnimation();

  async function playSequence() {
    // Phase 1: NFC card moves toward phone (tap)
    await nfcControls.start({
      x: -30,
      y: 60,
      rotateX: 10,
      rotateY: -5,
      scale: 0.95,
      boxShadow:
        "0 4px 8px -2px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.08)",
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    });

    // Phase 2: Contact ripple
    rippleControls.start({
      scale: [0, 2.5],
      opacity: [0.5, 0],
      transition: { duration: 0.6, ease: "easeOut" },
    });

    // Phase 3: Reveal vCard on screen
    screenControls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    });

    // Phase 4: NFC card returns
    await nfcControls.start({
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      boxShadow:
        "0 20px 40px -8px rgba(0,0,0,0.2), 0 8px 16px -4px rgba(0,0,0,0.1)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
    });
  }

  return (
    <motion.div
      className="relative flex items-center justify-center py-8"
      onViewportEnter={() => {
        // Small delay so the user sees the initial state
        setTimeout(playSequence, 400);
      }}
      viewport={{ once: true, amount: 0.5 }}
    >
      {/* Scene container with perspective */}
      <div className="relative" style={{ perspective: "800px" }}>
        {/* Smartphone */}
        <div className="relative h-[450px] w-[220px] overflow-hidden rounded-[2.5rem] border border-neutral-200 bg-neutral-950 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35),0_10px_25px_-8px_rgba(0,0,0,0.2)] lg:h-[500px] lg:w-[245px]">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2 z-20 h-[14px] w-[60px] -translate-x-1/2 rounded-full bg-black" />

          {/* Screen area */}
          <div className="absolute inset-[6px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900">
            {/* Ripple effect */}
            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/4 z-30 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
              initial={{ scale: 0, opacity: 0 }}
              animate={rippleControls}
            />

            {/* vCard content */}
            <motion.div
              className="h-full w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={screenControls}
            >
              <MiniVcard />
            </motion.div>
          </div>
        </div>

        {/* NFC Card */}
        <motion.div
          className="absolute -right-8 -top-4 z-10 flex h-[65px] w-[100px] items-center justify-center rounded-xl border border-neutral-100 bg-white"
          style={{
            boxShadow:
              "0 20px 40px -8px rgba(0,0,0,0.2), 0 8px 16px -4px rgba(0,0,0,0.1)",
          }}
          animate={nfcControls}
        >
          <Nfc className="size-7 text-neutral-400" />
        </motion.div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify animation works**

Run: `npm run dev` and check `http://localhost:3000`. Scroll to the hero — the NFC card should animate toward the phone, ripple appears, vCard fades in, card returns.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/hero-vcard-animation.tsx
git commit -m "feat: add motion animation sequence to hero NFC tap"
```

---

### Task 3: Update hero section layout to two columns

**Files:**
- Modify: `components/marketing/sections/hero-section.tsx`

- [ ] **Step 1: Replace the hero section with two-column layout**

Replace the entire content of `components/marketing/sections/hero-section.tsx`:

```tsx
"use client";

import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroVcardAnimation } from "../hero-vcard-animation";

export function HeroSection() {
  return (
    <section id="hero" className="py-16 scroll-mt-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-16 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Left column — text content (unchanged) */}
          <div className="flex flex-col items-start gap-6">
            {/* Announcement Pill */}
            <Link
              href="#features"
              className={cn(
                "relative inline-flex max-w-full items-center gap-3 overflow-hidden rounded-md px-3.5 py-2 text-sm",
                "bg-marketing-card",
                "hover:bg-marketing-card-hover",
                "dark:ring-inset dark:ring-1 dark:ring-white/5",
                "sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-3 sm:py-0.5",
              )}
            >
              <span className="truncate text-pretty sm:truncate">
                Novità: Card NFC personalizzate per il tuo team
              </span>
              <span className="hidden h-3 w-px bg-marketing-card-hover sm:block" />
              <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
                Scopri di più
                <ChevronRightIcon className="size-3" />
              </span>
            </Link>

            {/* Headline */}
            <h1
              className={cn(
                "max-w-5xl text-balance font-display text-5xl tracking-display-tight",
                "text-marketing-fg",
                "sm:text-5xl sm:leading-14",
                "lg:text-[5rem] lg:leading-20",
              )}
            >
              I biglietti da visita digitali per la tua azienda.
            </h1>

            {/* Description */}
            <div className="flex max-w-3xl flex-col gap-4 text-lg leading-8 text-marketing-fg-muted">
              <p>
                Crea e gestisci vCard digitali per tutto il team. Condividi
                contatti con un tap NFC o un link. Personalizza con i colori del
                tuo brand.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/auth/sign-up"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium",
                  "bg-marketing-accent text-marketing-accent-fg hover:bg-marketing-accent-hover",
                )}
              >
                Inizia ora
              </Link>
              <Link
                href="#features"
                className={cn(
                  "group inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                  "text-marketing-fg hover:bg-marketing-card-hover",
                )}
              >
                Scopri come funziona
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right column — NFC animation */}
          <div className="flex items-center justify-center lg:justify-end">
            <HeroVcardAnimation />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify two-column layout**

Run: `npm run dev` and check:
- Desktop (`lg+`): text left, animation right, vertically centered
- Mobile (`<lg`): text on top, animation below
- Animation still triggers correctly on scroll

- [ ] **Step 3: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/sections/hero-section.tsx
git commit -m "feat: update hero section to two-column layout with NFC animation"
```

---

### Task 4: Polish and responsive tuning

**Files:**
- Modify: `components/marketing/hero-vcard-animation.tsx`

- [ ] **Step 1: Add responsive scaling for mobile**

In `HeroVcardAnimation`, wrap the scene container with a responsive scale wrapper. Replace the outermost `motion.div` class:

```tsx
// Change the scene wrapper to include responsive scaling
<motion.div
  className="relative flex items-center justify-center py-8 lg:py-0"
  onViewportEnter={() => {
    setTimeout(playSequence, 400);
  }}
  viewport={{ once: true, amount: 0.5 }}
>
  {/* Scale down on small screens */}
  <div className="scale-[0.8] sm:scale-[0.85] lg:scale-100" style={{ perspective: "800px" }}>
```

Remove the old `<div className="relative" style={{ perspective: "800px" }}>` — the new wrapper replaces it.

- [ ] **Step 2: Verify responsive behavior**

Run: `npm run dev` and check at various breakpoints:
- `<640px` (mobile): animation scaled to 80%, centered below text
- `640-1023px` (tablet): animation scaled to 85%
- `1024px+` (desktop): full size, right column

- [ ] **Step 3: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 4: Final commit**

```bash
git add components/marketing/hero-vcard-animation.tsx
git commit -m "feat: add responsive scaling to hero NFC animation"
```
