/*
 * SAMPLE DATA — FOR PROTOTYPE USE ONLY
 * ------------------------------------------------------------------
 * Everything in this file is illustrative placeholder content.
 *  - Control IDs use a "SMP-" prefix so they cannot be confused with
 *    real Secure Controls Framework (SCF) identifiers.
 *  - Framework references are hand-picked, plausible examples. They
 *    have NOT been validated against the SCF Set Theory Relationship
 *    Mappings (STRM) and must not be used for client deliverables.
 *  - The engagement, assessment statuses and evidence notes describe
 *    a fictional organisation. No customer data is included.
 *
 * When the SCF archive is added to the repository, this file should be
 * replaced by data generated from it (see README.md, "Next steps").
 */
window.GRC_DATA = {
  meta: {
    datasetLabel: "Sample data",
    engagement: "Fictional engagement — “Northwind Process Industries” (sample)",
    assessmentPeriod: "Q3 2026 (sample)",
    note: "Illustrative controls and mappings. Not derived from the SCF archive and not validated."
  },

  frameworks: [
    { id: "iso27001", short: "ISO 27001", name: "ISO/IEC 27001:2022", color: "#2563eb" },
    { id: "nist80053", short: "NIST 800-53", name: "NIST SP 800-53 Rev. 5", color: "#7c3aed" },
    { id: "iec62443", short: "IEC 62443", name: "ISA/IEC 62443 (2-1, 3-3)", color: "#0891b2" },
    { id: "nist80082", short: "NIST 800-82", name: "NIST SP 800-82 Rev. 3 (OT overlay)", color: "#0d9488" },
    { id: "soc2", short: "SOC 2", name: "SOC 2 — 2017 Trust Services Criteria", color: "#ca8a04" },
    { id: "nis2", short: "NIS2", name: "NIS2 Directive (EU) 2022/2555", color: "#dc2626" },
    { id: "euaiact", short: "EU AI Act", name: "EU AI Act — Regulation (EU) 2024/1689", color: "#db2777" },
    { id: "gdpr", short: "GDPR", name: "GDPR — Regulation (EU) 2016/679", color: "#4f46e5" }
  ],

  statuses: [
    { id: "implemented", label: "Implemented" },
    { id: "partial", label: "Partially implemented" },
    { id: "not-implemented", label: "Not implemented" },
    { id: "not-assessed", label: "Not assessed" },
    { id: "not-applicable", label: "Not applicable" }
  ],

  controls: [
    {
      id: "SMP-GOV-01",
      title: "Information security policy & governance",
      domain: "Governance",
      description: "A documented, management-approved security policy set is published, communicated and reviewed at planned intervals, with clear accountability at board level.",
      frameworks: {
        iso27001: ["5.2", "A.5.1"],
        nist80053: ["PL-1", "PM-1"],
        iec62443: ["62443-2-1 (CSMS policy)"],
        nist80082: ["App. F overlay — PL-1"],
        soc2: ["CC1.2", "CC5.3"],
        nis2: ["Art. 20(1)", "Art. 21(2)(a)"],
        euaiact: ["Art. 17(1)"],
        gdpr: ["Art. 24(2)"]
      },
      assessment: {
        status: "implemented",
        owner: "CISO",
        lastAssessed: "2026-08-14",
        note: "Policy set approved by the executive board in May 2026; annual review cycle is scheduled."
      },
      evidence: [
        { name: "Information Security Policy v3.1", type: "Document", note: "Signed by CEO; review date recorded." },
        { name: "Board minutes extract", type: "Record", note: "Shows approval and cyber risk agenda item." }
      ]
    },
    {
      id: "SMP-RSK-01",
      title: "Risk assessment methodology",
      domain: "Risk Management",
      description: "Security and operational risks are identified, analysed and treated using a repeatable methodology covering IT, OT and AI-enabled systems.",
      frameworks: {
        iso27001: ["6.1.2", "6.1.3", "8.2"],
        nist80053: ["RA-3", "PM-9"],
        iec62443: ["62443-3-2 (risk assessment)"],
        nist80082: ["App. F overlay — RA-3"],
        soc2: ["CC3.1", "CC3.2"],
        nis2: ["Art. 21(1)", "Art. 21(2)(a)"],
        euaiact: ["Art. 9"],
        gdpr: ["Art. 32(1)", "Art. 35"]
      },
      assessment: {
        status: "partial",
        owner: "Risk Manager",
        lastAssessed: "2026-08-21",
        note: "IT risk register is mature; OT zones and the AI quality-inspection system are not yet in scope of the methodology."
      },
      evidence: [
        { name: "Risk methodology v2.0", type: "Document", note: "Likelihood/impact matrix defined; no OT consequence categories." },
        { name: "Corporate risk register export", type: "Spreadsheet", note: "42 IT risks; 0 OT risks recorded." }
      ]
    },
    {
      id: "SMP-AST-01",
      title: "Asset inventory (IT & OT)",
      domain: "Asset Management",
      description: "An accurate inventory of hardware, software and OT components (PLCs, HMIs, engineering workstations) is maintained with owners and criticality.",
      frameworks: {
        iso27001: ["A.5.9"],
        nist80053: ["CM-8"],
        iec62443: ["SR 7.8"],
        nist80082: ["App. F overlay — CM-8"],
        soc2: ["CC6.1"],
        nis2: ["Art. 21(2)(i)"],
        gdpr: ["Art. 30"]
      },
      assessment: {
        status: "partial",
        owner: "IT Operations Lead",
        lastAssessed: "2026-08-21",
        note: "CMDB covers corporate IT. OT assets tracked in a separate engineering spreadsheet without owners."
      },
      evidence: [
        { name: "CMDB summary report", type: "Report", note: "1,240 IT assets with owners." },
        { name: "OT asset spreadsheet", type: "Spreadsheet", note: "Last updated 2025; criticality column empty." }
      ]
    },
    {
      id: "SMP-IAC-01",
      title: "User account lifecycle management",
      domain: "Identity & Access",
      description: "User accounts are provisioned, reviewed and revoked through an approved process, including joiners, movers and leavers.",
      frameworks: {
        iso27001: ["A.5.16", "A.5.18"],
        nist80053: ["AC-2"],
        iec62443: ["SR 1.3"],
        nist80082: ["App. F overlay — AC-2"],
        soc2: ["CC6.2", "CC6.3"],
        nis2: ["Art. 21(2)(i)"],
        gdpr: ["Art. 32(1)(b)"]
      },
      assessment: {
        status: "implemented",
        owner: "IAM Manager",
        lastAssessed: "2026-08-15",
        note: "HR-driven provisioning in place; quarterly access reviews completed for the last four quarters."
      },
      evidence: [
        { name: "Q2 2026 access review sign-off", type: "Record", note: "All application owners signed." },
        { name: "Leaver sample test (25 users)", type: "Test result", note: "All accounts disabled within 24 hours." }
      ]
    },
    {
      id: "SMP-IAC-02",
      title: "Multi-factor authentication",
      domain: "Identity & Access",
      description: "MFA is enforced for remote access, privileged accounts and access to critical systems, including vendor remote access to OT.",
      frameworks: {
        iso27001: ["A.8.5"],
        nist80053: ["IA-2(1)", "IA-2(2)"],
        iec62443: ["SR 1.1 RE 2", "SR 1.13"],
        nist80082: ["App. F overlay — IA-2"],
        soc2: ["CC6.1"],
        nis2: ["Art. 21(2)(j)"]
      },
      assessment: {
        status: "partial",
        owner: "IAM Manager",
        lastAssessed: "2026-08-15",
        note: "MFA enforced for VPN and cloud admin. Vendor jump host to the OT DMZ still uses shared passwords."
      },
      evidence: [
        { name: "Conditional access policy export", type: "Configuration", note: "MFA required for all cloud sign-ins." },
        { name: "Jump host config screenshot", type: "Screenshot", note: "Local accounts, no MFA — finding raised." }
      ]
    },
    {
      id: "SMP-IAC-03",
      title: "Privileged access management",
      domain: "Identity & Access",
      description: "Privileged accounts are restricted, individually attributable, monitored and subject to least privilege.",
      frameworks: {
        iso27001: ["A.8.2"],
        nist80053: ["AC-6", "AC-6(5)"],
        iec62443: ["SR 2.1"],
        nist80082: ["App. F overlay — AC-6"],
        soc2: ["CC6.3"],
        nis2: ["Art. 21(2)(i)"]
      },
      assessment: {
        status: "not-implemented",
        owner: "IAM Manager",
        lastAssessed: "2026-08-15",
        note: "No PAM tooling. Domain admin group contains 14 members, including two service accounts."
      },
      evidence: [
        { name: "Domain admin group membership", type: "Report", note: "14 members; no review record." }
      ]
    },
    {
      id: "SMP-NET-01",
      title: "Network segmentation & IT/OT zoning",
      domain: "Network Security",
      description: "Networks are segmented into zones and conduits with controlled traffic between corporate IT, the OT DMZ and control networks.",
      frameworks: {
        iso27001: ["A.8.20", "A.8.22"],
        nist80053: ["SC-7"],
        iec62443: ["SR 5.1", "SR 5.2", "62443-3-2 (zones & conduits)"],
        nist80082: ["App. F overlay — SC-7"],
        soc2: ["CC6.6"],
        nis2: ["Art. 21(2)(e)"]
      },
      assessment: {
        status: "partial",
        owner: "OT Security Engineer",
        lastAssessed: "2026-08-28",
        note: "OT DMZ exists, but firewall ruleset between Level 3 and Level 2 contains broad 'any' rules."
      },
      evidence: [
        { name: "Network architecture diagram", type: "Diagram", note: "Purdue model levels shown; conduits not documented." },
        { name: "Firewall rule review", type: "Test result", note: "6 of 48 rules flagged as overly permissive." }
      ]
    },
    {
      id: "SMP-CRY-01",
      title: "Cryptographic protection of data",
      domain: "Data Protection",
      description: "Data is encrypted in transit and at rest using approved algorithms, with documented key management.",
      frameworks: {
        iso27001: ["A.8.24"],
        nist80053: ["SC-8", "SC-13", "SC-28"],
        iec62443: ["SR 4.1", "SR 4.3"],
        nist80082: ["App. F overlay — SC-8"],
        soc2: ["CC6.1", "CC6.7"],
        nis2: ["Art. 21(2)(h)"],
        gdpr: ["Art. 32(1)(a)"]
      },
      assessment: {
        status: "implemented",
        owner: "Security Architect",
        lastAssessed: "2026-08-19",
        note: "TLS 1.2+ enforced externally; storage encryption enabled on all cloud and laptop endpoints."
      },
      evidence: [
        { name: "Cryptography standard v1.4", type: "Document", note: "Approved algorithms and key lengths listed." },
        { name: "Endpoint encryption compliance report", type: "Report", note: "99.2% compliant; exceptions tracked." }
      ]
    },
    {
      id: "SMP-LOG-01",
      title: "Security event logging",
      domain: "Monitoring & Logging",
      description: "Security-relevant events are logged, protected from tampering and retained to support investigation and accountability.",
      frameworks: {
        iso27001: ["A.8.15"],
        nist80053: ["AU-2", "AU-9", "AU-11"],
        iec62443: ["SR 2.8", "SR 6.1"],
        nist80082: ["App. F overlay — AU-2"],
        soc2: ["CC7.2"],
        euaiact: ["Art. 12", "Art. 19"],
        gdpr: ["Art. 5(2)"]
      },
      assessment: {
        status: "partial",
        owner: "SOC Lead",
        lastAssessed: "2026-08-26",
        note: "IT logs centralised in SIEM. OT historian and AI inspection system logs are kept locally only."
      },
      evidence: [
        { name: "SIEM log source inventory", type: "Report", note: "85 sources; none from OT Level 2 or below." },
        { name: "Log retention setting", type: "Configuration", note: "12 months hot storage." }
      ]
    },
    {
      id: "SMP-MON-01",
      title: "Continuous security monitoring",
      domain: "Monitoring & Logging",
      description: "Systems and networks are monitored for anomalous behaviour, with alerts triaged by a defined function.",
      frameworks: {
        iso27001: ["A.8.16"],
        nist80053: ["SI-4"],
        iec62443: ["SR 6.2"],
        nist80082: ["App. F overlay — SI-4"],
        soc2: ["CC7.2", "CC7.3"],
        nis2: ["Art. 21(2)(b)"],
        euaiact: ["Art. 72"]
      },
      assessment: {
        status: "not-assessed",
        owner: "SOC Lead",
        lastAssessed: null,
        note: "Scheduled for fieldwork week 3 (sample)."
      },
      evidence: []
    },
    {
      id: "SMP-VUL-01",
      title: "Vulnerability & patch management",
      domain: "Vulnerability Management",
      description: "Vulnerabilities are identified, risk-ranked and remediated within defined timelines; OT patching follows vendor-qualified procedures.",
      frameworks: {
        iso27001: ["A.8.8"],
        nist80053: ["RA-5", "SI-2"],
        iec62443: ["62443-2-3 (patch management)", "SR 3.4"],
        nist80082: ["App. F overlay — SI-2"],
        soc2: ["CC7.1"],
        nis2: ["Art. 21(2)(e)"],
        euaiact: ["Art. 15(5)"]
      },
      assessment: {
        status: "partial",
        owner: "IT Operations Lead",
        lastAssessed: "2026-08-22",
        note: "Monthly IT patching meets SLA. No OT patch qualification process; HMIs run an unsupported OS."
      },
      evidence: [
        { name: "Vulnerability scan trend (6 months)", type: "Report", note: "Critical findings reduced by 60%." },
        { name: "HMI build sheet", type: "Document", note: "Windows 7 Embedded — compensating controls not documented." }
      ]
    },
    {
      id: "SMP-CHG-01",
      title: "Change management",
      domain: "Operations",
      description: "Changes to systems, including OT logic and AI models, are requested, risk-assessed, approved, tested and recorded.",
      frameworks: {
        iso27001: ["A.8.32"],
        nist80053: ["CM-3"],
        iec62443: ["62443-2-1 (change management)"],
        nist80082: ["App. F overlay — CM-3"],
        soc2: ["CC8.1"],
        nis2: ["Art. 21(2)(e)"],
        euaiact: ["Art. 17(1)(b)", "Art. 43(4)"]
      },
      assessment: {
        status: "implemented",
        owner: "Change Manager",
        lastAssessed: "2026-08-20",
        note: "ITSM workflow covers IT and OT changes. CAB minutes available; emergency changes reviewed retrospectively."
      },
      evidence: [
        { name: "Change sample test (30 changes)", type: "Test result", note: "29 of 30 had approval prior to implementation." }
      ]
    },
    {
      id: "SMP-INC-01",
      title: "Incident response & regulatory reporting",
      domain: "Incident Response",
      description: "A tested incident response plan defines roles, escalation and timelines for notifying authorities and affected parties.",
      frameworks: {
        iso27001: ["A.5.24", "A.5.26"],
        nist80053: ["IR-4", "IR-6", "IR-8"],
        iec62443: ["62443-2-1 (incident planning)", "SR 6.1"],
        nist80082: ["App. F overlay — IR-4"],
        soc2: ["CC7.4", "CC7.5"],
        nis2: ["Art. 21(2)(b)", "Art. 23"],
        euaiact: ["Art. 73"],
        gdpr: ["Art. 33", "Art. 34"]
      },
      assessment: {
        status: "partial",
        owner: "CISO",
        lastAssessed: "2026-08-27",
        note: "IR plan exists but does not reflect NIS2 24h/72h reporting stages or AI Act serious-incident reporting."
      },
      evidence: [
        { name: "Incident Response Plan v2.2", type: "Document", note: "GDPR 72h breach notification covered." },
        { name: "Tabletop exercise report (2025)", type: "Report", note: "Ransomware scenario; OT not included." }
      ]
    },
    {
      id: "SMP-BCM-01",
      title: "Backup & recovery",
      domain: "Resilience",
      description: "Backups of data, system images and OT configurations (PLC logic, HMI projects) are taken, protected and restore-tested.",
      frameworks: {
        iso27001: ["A.8.13", "A.5.30"],
        nist80053: ["CP-9", "CP-10"],
        iec62443: ["SR 7.3", "SR 7.4"],
        nist80082: ["App. F overlay — CP-9"],
        soc2: ["A1.2", "A1.3"],
        nis2: ["Art. 21(2)(c)"],
        gdpr: ["Art. 32(1)(c)"]
      },
      assessment: {
        status: "implemented",
        owner: "IT Operations Lead",
        lastAssessed: "2026-08-18",
        note: "Immutable backups in place; quarterly restore tests include one PLC program restore."
      },
      evidence: [
        { name: "Restore test log Q2 2026", type: "Record", note: "File server and PLC line 3 restored successfully." },
        { name: "Backup job configuration", type: "Configuration", note: "Daily incremental, weekly full, 90-day immutability." }
      ]
    },
    {
      id: "SMP-TPM-01",
      title: "Supplier & third-party security",
      domain: "Third-Party Management",
      description: "Suppliers, integrators and processors are risk-assessed, bound by security and data protection terms, and monitored.",
      frameworks: {
        iso27001: ["A.5.19", "A.5.20", "A.5.21"],
        nist80053: ["SR-3", "SR-6", "SA-9"],
        iec62443: ["62443-2-4 (service providers)"],
        nist80082: ["App. F overlay — SA-9"],
        soc2: ["CC9.2"],
        nis2: ["Art. 21(2)(d)", "Art. 21(3)"],
        euaiact: ["Art. 25"],
        gdpr: ["Art. 28"]
      },
      assessment: {
        status: "not-implemented",
        owner: "Procurement Lead",
        lastAssessed: "2026-08-25",
        note: "No security due diligence for OT integrators. DPAs signed for SaaS processors only."
      },
      evidence: [
        { name: "Supplier list", type: "Spreadsheet", note: "No risk tiering column." }
      ]
    },
    {
      id: "SMP-AWR-01",
      title: "Security & AI literacy awareness training",
      domain: "People",
      description: "Staff, including management bodies and OT engineers, receive role-appropriate security, privacy and AI literacy training.",
      frameworks: {
        iso27001: ["7.3", "A.6.3"],
        nist80053: ["AT-2", "AT-3"],
        iec62443: ["62443-2-1 (awareness & training)"],
        nist80082: ["App. F overlay — AT-3"],
        soc2: ["CC1.4", "CC2.2"],
        nis2: ["Art. 20(2)", "Art. 21(2)(g)"],
        euaiact: ["Art. 4"],
        gdpr: ["Art. 39(1)(b)"]
      },
      assessment: {
        status: "partial",
        owner: "HR Business Partner",
        lastAssessed: "2026-08-17",
        note: "Annual e-learning completion 91%. No board-level NIS2 training or AI literacy module yet."
      },
      evidence: [
        { name: "LMS completion report", type: "Report", note: "91% completion across 860 staff." }
      ]
    },
    {
      id: "SMP-PRV-01",
      title: "Privacy by design & DPIAs",
      domain: "Privacy",
      description: "Processing activities are recorded and high-risk processing, including AI systems using personal data, undergoes a DPIA before go-live.",
      frameworks: {
        iso27001: ["A.5.34"],
        nist80053: ["PT-2", "RA-8"],
        soc2: ["P1.1", "P3.1"],
        euaiact: ["Art. 10(5)", "Art. 26(9)", "Art. 27"],
        gdpr: ["Art. 25", "Art. 30", "Art. 35"]
      },
      assessment: {
        status: "partial",
        owner: "Data Protection Officer",
        lastAssessed: "2026-08-24",
        note: "RoPA maintained. Workforce-analytics pilot launched without a completed DPIA."
      },
      evidence: [
        { name: "Record of processing activities", type: "Spreadsheet", note: "38 processing activities documented." },
        { name: "DPIA register", type: "Spreadsheet", note: "Workforce-analytics DPIA in draft." }
      ]
    },
    {
      id: "SMP-AIG-01",
      title: "AI system inventory & risk classification",
      domain: "AI Governance",
      description: "AI systems are inventoried and classified under the EU AI Act risk tiers, with a named owner and intended purpose for each.",
      frameworks: {
        iso27001: ["A.5.9"],
        nist80053: ["CM-8", "PM-5"],
        soc2: ["CC3.2"],
        euaiact: ["Art. 6", "Art. 26(1)", "Art. 49"],
        gdpr: ["Art. 22", "Art. 30"]
      },
      assessment: {
        status: "not-implemented",
        owner: "Head of Data & AI",
        lastAssessed: "2026-08-24",
        note: "Three AI use cases identified in interviews; no formal inventory or risk-tier classification."
      },
      evidence: [
        { name: "Interview notes — Data & AI team", type: "Notes", note: "Vision-based quality inspection, demand forecasting, workforce analytics." }
      ]
    },
    {
      id: "SMP-AIG-02",
      title: "Human oversight of AI systems",
      domain: "AI Governance",
      description: "AI system outputs that affect safety or individuals are subject to defined human oversight, with the ability to override or stop the system.",
      frameworks: {
        nist80053: ["SI-10", "PM-28"],
        euaiact: ["Art. 14", "Art. 26(2)"],
        gdpr: ["Art. 22(3)"]
      },
      assessment: {
        status: "not-applicable",
        owner: "Head of Data & AI",
        lastAssessed: "2026-08-24",
        note: "Sample rationale: no high-risk AI system currently deployed. Revisit once SMP-AIG-01 classification is complete."
      },
      evidence: []
    },
    {
      id: "SMP-OTS-01",
      title: "Secure remote access to OT",
      domain: "Network Security",
      description: "Remote access to the control environment is brokered through a controlled jump point, approved per session, logged and time-limited.",
      frameworks: {
        iso27001: ["A.6.7", "A.8.20"],
        nist80053: ["AC-17", "AC-17(1)"],
        iec62443: ["SR 1.13", "SR 5.3"],
        nist80082: ["App. F overlay — AC-17"],
        soc2: ["CC6.6"],
        nis2: ["Art. 21(2)(i)", "Art. 21(2)(j)"]
      },
      assessment: {
        status: "not-implemented",
        owner: "OT Security Engineer",
        lastAssessed: "2026-08-28",
        note: "Vendor access is always-on via the jump host; no session approval or recording."
      },
      evidence: [
        { name: "Remote access procedure (draft)", type: "Document", note: "Not yet approved." }
      ]
    }
  ]
};
