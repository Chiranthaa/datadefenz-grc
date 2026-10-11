# datadefenz-grc

Internal GRC platform for DATADEFENZ consulting work.

> **Status: first prototype.** All controls, mappings, assessment statuses and
> evidence notes are **clearly labelled sample data** for a fictional
> organisation. There is no login, no customer data and no deployment.

## What's in the prototype

- **Dashboard** – headline figures, overall assessment status, per-framework
  coverage (select a framework to jump to its controls), priority gaps and a
  breakdown by domain.
- **Unified controls** – each control is listed once. Filter by framework
  (ISO 27001, NIST SP 800-53, IEC 62443, NIST SP 800-82, SOC 2, NIS2, EU AI Act,
  GDPR), status, domain or free-text search. Expand a control to see its
  framework references, assessment status and evidence notes. Filters are kept
  in the URL, so a filtered view can be bookmarked.

## Preview locally

No build step or dependencies are needed.

- **Quickest:** open `index.html` in a browser (double-click it).
- **Or serve it:** from the repository root run

  ```sh
  python3 -m http.server 8000
  ```

  then visit <http://localhost:8000>.

## Project structure

```
index.html            App shell: sidebar navigation, sample-data banner
assets/css/styles.css Styles (light/dark mode, responsive)
assets/js/data.js     SAMPLE dataset: frameworks, statuses, controls
assets/js/app.js      Hash routing and rendering of the two views
```

## About the sample data

- Control IDs use an `SMP-` prefix so they can't be mistaken for real Secure
  Controls Framework (SCF) IDs.
- Framework references are illustrative and **have not been validated** against
  the SCF Set Theory Relationship Mappings. Do not reuse them in client work.
- NIST SP 800-82 references point at the Rev. 3 OT overlay of SP 800-53
  (Appendix F).

## Next steps

1. Add the SCF archive and write an import script that generates the dataset
   from it, in place of `assets/js/data.js` (same shape: `frameworks`,
   `statuses`, `controls[].frameworks`).
2. Decide where assessments and evidence live (per engagement) before any real
   client data goes into the tool.
3. Add authentication and hosting only once the above are agreed.
