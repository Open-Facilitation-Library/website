# Design

## Theme

Light, editorial, library. A calm reading surface in warm neutrals with a slate-blue structural color and a single muted sage-green accent. Coheres with wiki.openfac.org (same typefaces and palette family) so the OFL surface reads as one project. Dark mode is out of scope for v1: this is a daytime, trust-building read, and the wiki already carries the dark option.

Scene: a facilitation researcher or civic-tech builder, on a laptop in daylight, following a link from a paper or a Substack post, deciding in under a minute whether OFL is rigorous and relevant. That forces a light, legible, type-led surface, not a dark product splash.

## Color

OKLCH. Tinted warm neutrals, never pure black or white. Derived from the OFL wiki palette.

- `--bg` warm off-white: `oklch(0.98 0.002 70)` (wiki `#faf8f8`)
- `--surface` faint raised warm gray: `oklch(0.965 0.003 70)`
- `--ink` warm near-black: `oklch(0.28 0.004 70)` (wiki `#2b2b2b`)
- `--muted` secondary text: `oklch(0.52 0.004 70)`
- `--hairline` borders: `oklch(0.90 0.003 70)` (wiki `#e5e5e5`)
- `--slate` structural blue: `oklch(0.42 0.05 245)` (wiki `#284b63`), for section eyebrows and the relationship section
- `--sage` accent fill/mark: `oklch(0.74 0.03 165)` (wiki `#84a59d`), used sparingly (markers, underlines, one hero element)
- `--sage-ink` accent as text: `oklch(0.55 0.04 165)`, a darkened sage that passes AA on `--bg`

Strategy: **Restrained.** Warm neutrals carry the surface; slate for structure; sage accent kept to roughly 10 percent or less. Sage at full lightness is a fill or mark, never body text.

## Typography

Matches the wiki so the family holds.

- Headers: **Schibsted Grotesk** (Google Fonts), medium 500 / semibold 600.
- Body: **Source Sans 3** (Source Sans Pro), regular 400, 16 to 18px, measure 65 to 75ch.
- Mono: **IBM Plex Mono**, for spec / skill identifiers and any code-shaped snippet.
- Hierarchy by scale and weight, steps at a 1.25 ratio or greater. A real display size for the hero; do not flatten the scale.

## Layout

- Single column with generous, varied vertical rhythm. Prose at about 68ch; the architecture section may run wider.
- No card-grid reflex. The three layers plus supporting repos render as a typographic labeled list with a leading sage marker, not identical icon cards.
- Sections, in order: hero, what OFL is, the architecture (Skills / Workflows / Synthesis, then Evals / Cross-Pollination), OFL and Harmonica, documented across 14 platforms, get involved (contribute and fund), footer.
- Do not wrap everything in a container; let sections breathe with whitespace and the occasional hairline.

## Components

- **Section eyebrow:** small Schibsted Grotesk label in slate, above the section heading.
- **Layer row:** layer name, one-line description, and a link out, as a clean list with a leading sage marker. No side-stripe borders.
- **Platform list:** the 14 platform names set inline as flowing text, with Harmonica emphasized (weight, not a badge).
- **Links:** text links with a sage underline or marker. Two primary actions at most (Read the wiki, GitHub org); the rest are quiet inline links.
- **Footer:** the top-nav links (Facilitators / Runtimes / Wiki / GitHub) on the left, a "Supported by" funder credit (Mozilla Foundation logo, full color) on the right.

## Motion

Minimal. At most a short fade-and-rise on scroll-in, ease-out-quint, fully disabled under prefers-reduced-motion. No parallax, no bounce, no animated gradients.

## Bans (enforced)

No hero-metric template, no pricing cards, no logo wall, no identical feature-card grid, no gradient text (`background-clip: text`), no decorative glassmorphism, no side-stripe accent borders, no em dashes in copy.
