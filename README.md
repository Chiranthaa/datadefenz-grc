# datadefenz-grc

Internal GRC platform for DATADEFENZ consulting work.

> **Status: prototype.** Controls and framework mappings come from the Secure
> Controls Framework (SCF) 2026.3. Assessment status, owners and evidence are
> **demo values** for a fictional organisation. There is no login and no
> customer data.

## What's in the prototype

- **Dashboard** – SCF catalogue figures (controls, mapping references, coverage
  per framework group, controls per SCF domain) and a separately labelled demo
  assessment section (status breakdown, priority gaps).
- **Unified controls** – each of the 1,028 SCF controls is listed once. Filter
  by the eight framework groups defined in the SCF file (ISO/IEC 27001, NIST SP
  800-53, IEC 62443, NIST SP 800-82, SOC 2, NIS2, EU AI Act, GDPR), by SCF
  domain, by demo status, or by free-text search. Expand a control to see its
  SCF description and control question, its framework mappings, and its demo
  assessment and evidence notes. Filters are kept in the URL.

## Preview locally

No build step or dependencies. The app loads the SCF JSON file at runtime, so
it must be served over HTTP (browsers block this when `index.html` is opened
directly from disk). From the repository root:

```sh
python3 -m http.server 8000
```

then visit <http://localhost:8000>.

## Project structure

```
index.html                        App shell: navigation, demo banner, SCF attribution footer
scf-2026.3-eight-frameworks.json  SCF controls and mappings (source data, unmodified)
assets/js/app.js                  Loads the SCF file; routing and rendering
assets/js/demo-assessment.js      DEMO status, owners and evidence, keyed by SCF control ID
assets/css/styles.css             Styles (light/dark mode, responsive)
```

## Data sources

**Secure Controls Framework (SCF) 2026.3** —
<https://securecontrolsframework.com>, licensed under
[CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/); see also the
[SCF license terms](https://securecontrolsframework.com/commercial-license).

- SCF control IDs, names, descriptions, control questions and mapping
  identifiers are displayed exactly as they appear in
  `scf-2026.3-eight-frameworks.json`. The app does not edit or add to them.
- The file is a filtered selection of SCF controls mapped to the eight
  framework groups. Framework groups and their source framework names are taken
  from the file's `framework_groups`.
- The attribution and license links appear in the footer of every page and must
  stay wherever this content is displayed or shared.

**Demo assessment values** — `assets/js/demo-assessment.js` holds invented
status, owner, date, assessor-note and evidence values for 21 SCF controls of a
fictional engagement. They are marked "Demo" throughout the UI. All other
controls show as "Not assessed".

## Next steps

1. Decide where real assessments and evidence live (per engagement) before any
   client data goes into the tool.
2. Add authentication and controlled hosting only once that is agreed.
