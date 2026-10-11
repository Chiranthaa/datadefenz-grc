/*
 * DEMO ASSESSMENT VALUES — FOR PROTOTYPE USE ONLY
 * ------------------------------------------------------------------
 * The SCF file (scf-2026.3-eight-frameworks.json) supplies controls and
 * framework mappings only. It contains no assessment status, owners or
 * evidence. Everything in this file is invented demo content for a
 * fictional organisation, keyed by real SCF control IDs so it can be
 * shown alongside the SCF catalogue. No customer data is included.
 *
 * Any SCF control not listed here is shown as "Not assessed".
 */
window.GRC_DEMO = {
  meta: {
    engagement: "Fictional engagement — “Northwind Process Industries” (demo)",
    assessmentPeriod: "Q3 2026 (demo)"
  },

  statuses: [
    { id: "implemented", label: "Implemented" },
    { id: "partial", label: "Partially implemented" },
    { id: "not-implemented", label: "Not implemented" },
    { id: "not-assessed", label: "Not assessed" },
    { id: "not-applicable", label: "Not applicable" }
  ],

  // Keyed by SCF control ID.
  assessments: {
    "GOV-02": {
      status: "implemented", owner: "CISO", lastAssessed: "2026-08-14",
      note: "Security programme charter approved by the executive board in May 2026; annual review cycle scheduled.",
      evidence: [
        { name: "Security programme charter v3.1", type: "Document", note: "Signed by CEO; review date recorded." },
        { name: "Board minutes extract", type: "Record", note: "Shows approval and cyber risk agenda item." }
      ]
    },
    "RSK-13": {
      status: "partial", owner: "Risk Manager", lastAssessed: "2026-08-21",
      note: "Annual IT risk assessment completed. OT zones and AI-enabled systems are not yet in scope.",
      evidence: [
        { name: "Risk assessment report 2026", type: "Report", note: "42 IT risks assessed; no OT consequence categories." }
      ]
    },
    "AST-04": {
      status: "partial", owner: "IT Operations Lead", lastAssessed: "2026-08-21",
      note: "CMDB covers corporate IT. OT assets tracked in a separate engineering spreadsheet without owners.",
      evidence: [
        { name: "CMDB summary report", type: "Report", note: "1,240 IT assets with owners." },
        { name: "OT asset spreadsheet", type: "Spreadsheet", note: "Last updated 2025; criticality column empty." }
      ]
    },
    "IAC-08": {
      status: "implemented", owner: "IAM Manager", lastAssessed: "2026-08-15",
      note: "HR-driven provisioning in place; quarterly access reviews completed for the last four quarters.",
      evidence: [
        { name: "Q2 2026 access review sign-off", type: "Record", note: "All application owners signed." },
        { name: "Leaver sample test (25 users)", type: "Test result", note: "All accounts disabled within 24 hours." }
      ]
    },
    "IAC-37": {
      status: "partial", owner: "IAM Manager", lastAssessed: "2026-08-15",
      note: "MFA enforced for VPN and cloud admin. Vendor jump host to the OT DMZ still uses shared passwords.",
      evidence: [
        { name: "Conditional access policy export", type: "Configuration", note: "MFA required for all cloud sign-ins." },
        { name: "Jump host config screenshot", type: "Screenshot", note: "Local accounts, no MFA — finding raised." }
      ]
    },
    "IAC-10": {
      status: "not-implemented", owner: "IAM Manager", lastAssessed: "2026-08-15",
      note: "No PAM tooling. Domain admin group contains 14 members, including two service accounts.",
      evidence: [
        { name: "Domain admin group membership", type: "Report", note: "14 members; no review record." }
      ]
    },
    "NET-06": {
      status: "partial", owner: "OT Security Engineer", lastAssessed: "2026-08-28",
      note: "OT DMZ exists, but the firewall ruleset between Level 3 and Level 2 contains broad 'any' rules.",
      evidence: [
        { name: "Network architecture diagram", type: "Diagram", note: "Purdue levels shown; conduits not documented." },
        { name: "Firewall rule review", type: "Test result", note: "6 of 48 rules flagged as overly permissive." }
      ]
    },
    "NET-26": {
      status: "not-implemented", owner: "OT Security Engineer", lastAssessed: "2026-08-28",
      note: "Vendor remote access is always-on via the jump host; no session approval or recording.",
      evidence: [
        { name: "Remote access procedure (draft)", type: "Document", note: "Not yet approved." }
      ]
    },
    "CRY-07": {
      status: "implemented", owner: "Security Architect", lastAssessed: "2026-08-19",
      note: "Storage encryption enabled on all cloud storage and laptop endpoints.",
      evidence: [
        { name: "Endpoint encryption compliance report", type: "Report", note: "99.2% compliant; exceptions tracked." }
      ]
    },
    "MON-05": {
      status: "partial", owner: "SOC Lead", lastAssessed: "2026-08-26",
      note: "IT logs centralised in SIEM. OT historian and AI inspection system logs are kept locally only.",
      evidence: [
        { name: "SIEM log source inventory", type: "Report", note: "85 sources; none from OT Level 2 or below." }
      ]
    },
    "MON-02": {
      status: "not-assessed", owner: "SOC Lead", lastAssessed: null,
      note: "Scheduled for fieldwork week 3 (demo).",
      evidence: []
    },
    "VPM-08": {
      status: "partial", owner: "IT Operations Lead", lastAssessed: "2026-08-22",
      note: "Monthly IT patching meets SLA. No OT patch qualification process; HMIs run an unsupported OS.",
      evidence: [
        { name: "Patch compliance trend (6 months)", type: "Report", note: "Critical patches applied within 14 days." },
        { name: "HMI build sheet", type: "Document", note: "Unsupported OS — compensating controls not documented." }
      ]
    },
    "CHG-02": {
      status: "implemented", owner: "Change Manager", lastAssessed: "2026-08-20",
      note: "ITSM workflow covers IT and OT changes. CAB minutes available.",
      evidence: [
        { name: "Change sample test (30 changes)", type: "Test result", note: "29 of 30 approved before implementation." }
      ]
    },
    "IRO-08": {
      status: "partial", owner: "CISO", lastAssessed: "2026-08-27",
      note: "IR plan exists but does not reflect regulatory reporting stages for all applicable regimes.",
      evidence: [
        { name: "Incident Response Plan v2.2", type: "Document", note: "Last tested in 2025; OT not included." }
      ]
    },
    "IRO-22": {
      status: "implemented", owner: "Data Protection Officer", lastAssessed: "2026-08-24",
      note: "Breach procedure defines assessment, notification decision and record-keeping.",
      evidence: [
        { name: "Data breach procedure v1.3", type: "Document", note: "Includes notification decision tree." },
        { name: "Breach log", type: "Record", note: "Two minor incidents recorded in 2026." }
      ]
    },
    "BCD-24": {
      status: "implemented", owner: "IT Operations Lead", lastAssessed: "2026-08-18",
      note: "Immutable backups in place; quarterly restore tests include one PLC program restore.",
      evidence: [
        { name: "Restore test log Q2 2026", type: "Record", note: "File server and PLC line 3 restored successfully." }
      ]
    },
    "TPM-10": {
      status: "not-implemented", owner: "Procurement Lead", lastAssessed: "2026-08-25",
      note: "No security risk assessment before onboarding OT integrators or SaaS suppliers.",
      evidence: [
        { name: "Supplier list", type: "Spreadsheet", note: "No risk tiering column." }
      ]
    },
    "SAT-04": {
      status: "partial", owner: "HR Business Partner", lastAssessed: "2026-08-17",
      note: "Annual e-learning completion 91%. No role-based module for OT engineers or management.",
      evidence: [
        { name: "LMS completion report", type: "Report", note: "91% completion across 860 staff." }
      ]
    },
    "RSK-19": {
      status: "partial", owner: "Data Protection Officer", lastAssessed: "2026-08-24",
      note: "DPIA process exists. Workforce-analytics pilot launched before its DPIA was completed.",
      evidence: [
        { name: "DPIA register", type: "Spreadsheet", note: "Workforce-analytics DPIA in draft." }
      ]
    },
    "AAT-02": {
      status: "not-implemented", owner: "Head of Data & AI", lastAssessed: "2026-08-24",
      note: "Three AI use cases identified in interviews; no AI governance policy or inventory.",
      evidence: [
        { name: "Interview notes — Data & AI team", type: "Notes", note: "Quality inspection, demand forecasting, workforce analytics." }
      ]
    },
    "AAT-35.1": {
      status: "not-applicable", owner: "Head of Data & AI", lastAssessed: "2026-08-24",
      note: "Demo rationale: no AI system currently makes decisions without human review. Revisit after AAT-02.",
      evidence: []
    }
  }
};
