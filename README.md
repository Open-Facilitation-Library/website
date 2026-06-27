# openfac.org

The Open Facilitation Library landing site, served at [openfac.org](https://openfac.org).

A zero-build static site: HTML and one stylesheet, no framework.

- `index.html` — home
- `facilitators/` — for facilitators (annotation, curation, the data-co-op vision)
- `runtimes/` — what makes a runtime capable
- `calibrate/` — criteria-review tool, generated; see below
- `styles.css` — the shared stylesheet
- `llms.txt` — machine-readable site summary ([llmstxt.org](https://llmstxt.org))

## Generated page: `calibrate/`

`calibrate/index.html` is the one generated file. It lets a practitioner review the eval criteria for a method (keep / reword / cut, add missing, note) stage by stage and submit a pre-filled GitHub issue on [`method-specs`](https://github.com/Open-Facilitation-Library/method-specs). The 44-stage corpus is baked in from the `method-specs` eval YAMLs, so the deployed site stays static. Regenerate after the specs change:

```
npm install                 # one-time, dev only (js-yaml)
npm run build-calibrate      # reads ../OFL/method-specs by default
# or: node scripts/build-calibrate.mjs <path-to-method-specs>
```

Linked from `/facilitators` ("Calibrate"). Built for HAR-1236.

Design context for keeping it on-brand lives in `PRODUCT.md` and `DESIGN.md`. The visual language coheres with the [wiki](https://wiki.openfac.org): Schibsted Grotesk, Source Sans, warm neutrals, a single sage accent.

Deployed via GitHub Pages on the openfac.org apex.
