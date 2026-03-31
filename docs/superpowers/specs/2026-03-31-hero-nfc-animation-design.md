# Hero NFC Tap Animation — Design Spec

## Obiettivo

Aggiungere alla hero section del sito marketing un'animazione che simula il tap di una card NFC su uno smartphone, rivelando una replica della vCard pubblica. L'animazione comunica immediatamente il valore del prodotto: "tocca la card, vedi il contatto".

## Approccio

**Ibrido CSS/Motion** — elementi HTML/CSS con `perspective` e `rotateX/Y` per profondità 3D, animati con la libreria `motion` (già installata). Nessun WebGL, nessuna dipendenza nuova.

## Layout Hero

Due colonne su desktop, stack verticale su mobile:

```
Desktop (lg+):
┌──────────────────────────────────────────────────┐
│  [Annuncio pill]                                  │
│                                                    │
│  Headline + sottotitolo      │   Animazione NFC    │
│  [CTA primario] [CTA sec.]  │   tap → vCard        │
│                                                    │
└──────────────────────────────────────────────────┘

Mobile (<lg):
┌────────────────────┐
│  [Annuncio pill]    │
│  Headline           │
│  Sottotitolo        │
│  [CTA] [CTA]        │
│                      │
│  Animazione NFC      │
│  (scala ridotta)     │
└────────────────────┘
```

Il contenuto testuale esistente (headline, sottotitolo, CTA) resta invariato, si sposta nella colonna sinistra. L'animazione occupa la colonna destra.

- `lg+`: `grid grid-cols-2`, animazione a destra
- `<lg`: stack verticale, animazione sotto i CTA

## Componenti dell'animazione

### Smartphone

- Div con `rounded-3xl`, bordo sottile grigio (`border border-neutral-200`), sfondo scuro/gradiente
- Dynamic island in alto (pill centrata, ~40x12px, `rounded-full`, sfondo nero)
- Aspect ratio ~9:19 (proporzioni realistiche)
- Altezza: ~450px desktop, ~350px mobile
- Ombre morbide multiple: `shadow-2xl` + ombra custom diffusa

### Card NFC

- Rettangolo piccolo (~100x65px), `rounded-xl`
- Sfondo bianco con bordo sottilissimo
- Solo icona `Nfc` da Lucide centrata, colore grigio/neutro
- Ombre pronunciate multi-layer per dare profondità/flottamento
- Posizione iniziale: in alto a destra dello smartphone, leggermente sovrapposta

### Mini vCard (dentro lo smartphone)

Replica statica hardcoded della vCard pubblica. Non importa i componenti reali (VcardHead, VcardBody) per evitare dipendenze server-side e hook.

Contenuto:
- **Aurora**: gradiente CSS radiale (viola `#5227FF` → verde `#7cff67`), non WebGL
- **Header**: logo finto (placeholder), nome "Marco Rossi", ruolo "Sales Manager"
- **Avatar**: placeholder cerchio con iniziali "MR"
- **Tab contatti**: lista stilizzata con icone (telefono, email, LinkedIn)
- **Pulsante**: "Aggiungi contatto" in basso

Scalata con `transform: scale()` per stare dentro lo smartphone. Overflow hidden con bordi arrotondati.

## Sequenza Animazione

Trigger: `whileInView` con `once: true` — parte quando il componente entra nel viewport, non si ripete.

| Fase | Durata | Descrizione |
|------|--------|-------------|
| 1. Stato iniziale | — | Smartphone con schermo scuro/gradiente. Card NFC flottante in alto a destra. |
| 2. Tap | ~0.8s | Card NFC si muove verso lo smartphone. Si inclina con `rotateX(10deg) rotateY(-5deg)` via CSS `perspective(800px)`. L'ombra si accorcia (si avvicina alla superficie). |
| 3. Contatto | ~0.2s | Micro-rimbalzo (spring). Pulse/ripple luminoso circolare dal punto di contatto. |
| 4. Reveal vCard | ~0.6s | La mini vCard appare sullo schermo con fade-in + slide dal basso (`opacity 0→1`, `translateY 20px→0`). |
| 5. Card si allontana | ~0.5s | Card NFC torna nella posizione originale. Ombra si allunga di nuovo. |
| 6. Stato finale | — | Smartphone con vCard visibile. Card NFC ferma nella posizione originale. |

Orchestrazione con `useAnimation` di motion per controllare la sequenza step-by-step.

## File

### Da creare

| File | Scopo |
|------|-------|
| `components/marketing/hero-vcard-animation.tsx` | Componente unico: smartphone + card NFC + mini vCard + logica animazione |

### Da modificare

| File | Modifica |
|------|----------|
| `components/marketing/sections/hero-section.tsx` | Layout a 2 colonne, importa `HeroVcardAnimation` nella colonna destra |

## Dipendenze

- `motion` (v12.38, già installato) — animazioni, `whileInView`, `useAnimation`
- `lucide-react` (già installato) — icona `Nfc`, `Phone`, `Mail`, `Linkedin`
- Tailwind CSS — ombre, perspective, responsive, bordi
- **Nessuna dipendenza nuova da installare**

## Performance

- Zero canvas WebGL — tutto CSS/HTML
- `once: true` su `whileInView` — nessun re-render continuo
- Nessun bundle aggiuntivo
- La mini vCard è HTML statico, nessun fetch/stato

## Fuori scope

- Interattività sulla mini vCard (scroll, click, copia)
- Aurora WebGL dentro lo smartphone
- Tilt 3D on hover dello smartphone
- Versione dark mode (segue il tema esistente della hero)
