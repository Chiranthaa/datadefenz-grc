# Compliance workflow

How the IT/OT compliance workspace works, where each piece of data comes
from, and what still needs expert validation.

## Workflow

1. **Frameworks** (`/orgs/<id>/frameworks`): a customer admin (or DATADEFENZ
   platform owner) selects which of the eight framework groups apply:
   ISO/IEC 27001, NIST SP 800-53, IEC 62443, NIST SP 800-82, SOC 2, NIS2,
   EU AI Act, GDPR. The groups and their source framework names come from
   the SCF file's `framework_groups`.
2. **Requirements** (`/orgs/<id>/requirements`): one unified list. Each row is
   one SCF control that the SCF maps to at least one selected framework. A
   control mapped to several selected frameworks appears **once**, tagged
   with each of them, so shared work is not duplicated.
3. **Requirement detail** (`/orgs/<id>/requirements/<SCF ID>`): SCF statement
   and control question (verbatim), exact framework identifiers with their
   provenance, DATADEFENZ guidance where reviewed guidance exists,
   framework-specific notes, the assessment form and evidence.
4. **Assessment**: Implemented, Partially implemented, Not implemented, Not
   applicable (or back to Not assessed), with owner, date and notes.
5. **Evidence** is tracked separately: an evidence status (not provided /
   partially provided / provided) plus evidence records with optional files
   in the organisation's private storage folder. Marking a requirement
   "Implemented" never sets the evidence status.
6. **Dashboard** (`/orgs/<id>`): assessment progress, gaps, evidence provided
   and missing, per-framework breakdown and framework-specific count. Every
   number links to the filtered list. A disclaimer states these are
   self-assessment results, not a certification or guarantee of compliance.

Filters on the requirements list: framework, assessment status (including
"gaps"), evidence (including "missing" = implemented/partial without full
evidence), SCF domain, framework-specific only, and text search.

## Where the data comes from

| Content | Source | Status shown in the app |
|---|---|---|
| Requirement ID, name, domain, statement, control question | SCF 2026.3 (`data/scf/`), verbatim | “Source: SCF 2026.3 (CC BY-ND 4.0), shown verbatim” |
| Framework identifiers (clause / control / article / criterion) | SCF 2026.3 mappings, verbatim | Per mapping: **Sourced** (default), **Reviewed by DATADEFENZ**, **Needs validation**, or **Review out of date** |
| Framework-specific flag | Derived from SCF mappings: mapped to only one of the eight groups | “Framework-specific” tag |
| Plain-language summary, implementation guide, technical references (NIST/CIS), expected evidence, evidence example | **DATADEFENZ-authored** in the app by platform owners | Draft (platform owners only) or Reviewed (visible to customers). Missing content is stated as missing. |
| Framework-specific notes | **DATADEFENZ-authored** per requirement and framework | Draft / Reviewed |
| Assessment, evidence status, evidence records | Customer (per organisation) | Isolated by organisation (RLS) |

Nothing is generated or inferred. Where content does not exist, the app says
so (for example “No reviewed implementation guide yet”).

### Mapping reviews

A platform owner can mark each mapping entry (one SCF control × one source
framework, e.g. `EMEA EU NIS2 2022`) as *reviewed* or *needs validation*,
with a note. The review stores the identifiers that were checked; if a later
SCF import changes them, the app shows “Review out of date”.

### Guidance review

Guidance and framework notes are saved as **draft** (visible only to
platform owners) or **marked reviewed** (visible to customers). Authorship
and review stamps come from the signed-in session, not the form. If the same
person wrote and reviewed it, the editor shows a “second reviewer
recommended” notice; four-eyes review is not yet enforced.

## Licensing

- **SCF** content is CC BY-ND 4.0 (see `data/scf/` metadata, footer and
  README). It is stored and displayed unmodified, with attribution and
  licence links on every signed-in page. DATADEFENZ guidance is stored
  separately and labelled as DATADEFENZ content. Plain-language summaries
  should be written independently, not as close paraphrases of SCF text.
  Check the [SCF licence terms](https://securecontrolsframework.com/commercial-license)
  for commercial consulting use.
- **CIS** and **NIST** guidance text is **not** in the repository. CIS is
  not one of the eight frameworks. Consultants may cite NIST or CIS
  references in the “Technical references” field after verifying them;
  check CIS licence terms before reproducing CIS text.

## What still needs expert validation

1. **Every mapping is “sourced” only.** None has been reviewed by DATADEFENZ.
   The SCF file does not include relationship strength (equal / subset /
   intersects), so a mapping does not show whether the SCF control fully
   covers a clause.
2. **No guidance exists yet.** Plain-language summaries, implementation
   guides, NIST/CIS references, expected evidence and examples must be
   written and reviewed for each requirement, ideally starting with the most
   common ones (those shared by most selected frameworks).
3. **Framework-specific obligations** beyond the SCF mapping (e.g. NIS2
   reporting timelines, EU AI Act provider/deployer duties, GDPR
   controller/processor duties) need framework notes.
4. **Scope size.** NIST SP 800-82 / 800-53 map to ~776 SCF controls; a
   Northwind-style scope yields ~900 requirements. Consider tailoring
   (e.g. overlay level, applicability) before real engagements.
5. **SCF version.** The library holds one version (2026.3). Versioning and
   migration of assessments between SCF releases are not implemented.

## Not implemented yet

- Bulk assessment, assignment of requirements to people, due dates and
  remediation plans.
- Exports (CSV/PDF) and audit history of assessment changes.
- Per-overlay (LOW/MODERATE/HIGH) tailoring of NIST SP 800-82.
- Enforced four-eyes review for guidance and mapping reviews.
