/*
 * DATADEFENZ GRC — prototype front end.
 * Plain JavaScript, no build step.
 *
 * Control content comes from scf-2026.3-eight-frameworks.json (Secure
 * Controls Framework). SCF IDs, names, descriptions, control questions and
 * mapping identifiers are displayed exactly as supplied — never edited here.
 * Assessment status, owners and evidence come from window.GRC_DEMO
 * (assets/js/demo-assessment.js) and are demo values only.
 */
(function () {
  "use strict";

  const SCF_URL = "scf-2026.3-eight-frameworks.json";
  const PAGE_SIZE = 50;

  // UI colours per framework group (presentation only).
  const GROUP_COLORS = {
    iso27001: "#2563eb",
    nist80053: "#7c3aed",
    iec62443: "#0891b2",
    nist80082: "#0d9488",
    soc2: "#ca8a04",
    nis2: "#dc2626",
    eu_ai_act: "#db2777",
    gdpr: "#4f46e5"
  };
  const FALLBACK_COLOR = "#64748b";

  const DEMO = window.GRC_DEMO;
  const STATUS_BY_ID = Object.fromEntries(DEMO.statuses.map((s) => [s.id, s]));
  const view = document.getElementById("view");

  // Populated once the SCF file has loaded.
  let SCF, GROUPS, GROUP_BY_ID, CONTROLS, DOMAINS;

  // Controls expanded on the Controls page; survives filter changes.
  const expanded = new Set();

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function pct(part, whole) {
    return whole ? Math.round((part / whole) * 100) : 0;
  }

  function fmt(n) {
    return n.toLocaleString("en-GB");
  }

  const demoTag = `<span class="demo-tag" title="Demo value — not part of the SCF data">Demo</span>`;

  function statusBadge(statusId, withDemoTag) {
    const s = STATUS_BY_ID[statusId];
    return `<span class="badge status-${esc(statusId)}"><span class="dot"></span>${esc(s.label)}${withDemoTag ? demoTag : ""}</span>`;
  }

  function groupTag(groupId, active) {
    const g = GROUP_BY_ID[groupId];
    return `<span class="fw-tag${active ? " is-active" : ""}" style="--fw:${g.color}">${esc(g.name)}</span>`;
  }

  function countByStatus(controls) {
    const counts = Object.fromEntries(DEMO.statuses.map((s) => [s.id, 0]));
    controls.forEach((c) => { counts[c.status] += 1; });
    return counts;
  }

  function stackedBar(counts, total, label, extraClass) {
    const segs = DEMO.statuses
      .filter((s) => counts[s.id] > 0)
      .map((s) => `<span class="seg status-${s.id}" style="flex:${counts[s.id]}" title="${esc(s.label)}: ${counts[s.id]}"></span>`)
      .join("");
    return `<div class="stacked${extraClass ? " " + extraClass : ""}" role="img" aria-label="${esc(label)}">${total ? segs : ""}</div>`;
  }

  function meter(value, max, color, label) {
    return `<div class="meter" role="img" aria-label="${esc(label)}"><span style="width:${pct(value, max)}%;background:${color}"></span></div>`;
  }

  /* ---------- data loading ---------- */

  function prepare(data) {
    SCF = data;
    GROUPS = data.framework_groups.map((g) => ({
      ...g,
      color: GROUP_COLORS[g.id] || FALLBACK_COLOR
    }));
    GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
    const groupOfSource = {};
    GROUPS.forEach((g) => g.source_names.forEach((name) => { groupOfSource[name] = g.id; }));

    CONTROLS = data.controls.map((c) => {
      // Mapping entries grouped under their framework group, in file order.
      const byGroup = {};
      c.mappings.forEach((m) => {
        const gid = groupOfSource[m.framework];
        if (!gid) return;
        (byGroup[gid] = byGroup[gid] || []).push(m);
      });
      const demo = DEMO.assessments[c.scf_id] || null;
      return {
        scf: c,
        id: c.scf_id,
        groups: GROUPS.map((g) => g.id).filter((id) => byGroup[id]),
        byGroup,
        demo,
        status: demo ? demo.status : "not-assessed",
        refCount: c.mappings.reduce((n, m) => n + m.ids.length, 0),
        haystack: [
          c.scf_id, c.scf_control_name, c.scf_domain, c.description, c.control_question,
          ...c.mappings.flatMap((m) => [m.framework, ...m.ids]),
          ...(demo ? [demo.owner, demo.note, ...demo.evidence.flatMap((e) => [e.name, e.note])] : [])
        ].join(" ").toLowerCase()
      };
    });
    DOMAINS = [...new Set(CONTROLS.map((c) => c.scf.scf_domain))].sort();

    const m = data.metadata;
    document.getElementById("attribution").innerHTML = `
      Control content: <a href="${esc(m.source_url)}" rel="noopener">${esc(m.source)}</a>, version ${esc(m.version)},
      licensed under <a href="${esc(m.license_url)}" rel="noopener">${esc(m.license)}</a>.
      See also the <a href="${esc(m.terms_url)}" rel="noopener">SCF license terms</a>.
      <span class="attribution-note">${esc(m.notice)}</span>`;
  }

  function showLoadError(err) {
    const fileProtocol = location.protocol === "file:";
    view.innerHTML = `
      <div class="card error-card">
        <h1>Couldn't load the SCF data</h1>
        ${fileProtocol
          ? `<p>Browsers block reading <code>${SCF_URL}</code> when the page is opened directly from disk.
             Serve the folder instead, then open <a href="http://localhost:8000">http://localhost:8000</a>:</p>
             <pre><code>python3 -m http.server 8000</code></pre>`
          : `<p>Check that <code>${SCF_URL}</code> is in the same folder as <code>index.html</code>.</p>`}
        <p class="muted small">${esc(err && err.message)}</p>
      </div>`;
  }

  /* ---------- routing ---------- */

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, query = ""] = raw.split("?");
    return { route: path || "dashboard", params: new URLSearchParams(query) };
  }

  function render() {
    const { route, params } = parseHash();
    document.querySelectorAll(".nav a").forEach((a) => {
      a.classList.toggle("is-active", a.dataset.route === route);
      if (a.dataset.route === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (route === "controls") renderControls(params);
    else renderDashboard();
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ---------- dashboard ---------- */

  function renderDashboard() {
    document.title = "Dashboard — DATADEFENZ GRC";
    const total = CONTROLS.length;
    const totalRefs = CONTROLS.reduce((n, c) => n + c.refCount, 0);
    const demoControls = CONTROLS.filter((c) => c.demo);
    const demoCounts = countByStatus(demoControls);
    const assessed = demoControls.length - demoCounts["not-assessed"];
    const gaps = demoCounts.partial + demoCounts["not-implemented"];
    const meta = SCF.metadata;

    const kpis = [
      { label: "SCF controls", value: fmt(total), sub: `SCF ${meta.version} · ${GROUPS.length} framework groups` },
      { label: "Mapping references", value: fmt(totalRefs), sub: "Framework identifiers mapped to SCF controls" },
      { label: "Controls assessed", value: fmt(assessed), sub: `of ${fmt(total)} SCF controls`, demo: true },
      { label: "Open gaps", value: fmt(gaps), sub: `${demoCounts["not-implemented"]} not implemented · ${demoCounts.partial} partial`, tone: "warn", demo: true }
    ];

    const groupRows = GROUPS.map((g) => {
      const mapped = CONTROLS.filter((c) => c.byGroup[g.id]);
      const refs = mapped.reduce((n, c) => n + c.byGroup[g.id].reduce((k, m) => k + m.ids.length, 0), 0);
      return `
        <tr>
          <th scope="row">
            <a class="fw-link" href="#/controls?fw=${encodeURIComponent(g.id)}">
              <span class="fw-swatch" style="--fw:${g.color}"></span>
              <span><strong>${esc(g.name)}</strong><small>${g.source_names.map(esc).join(" · ")}</small></span>
            </a>
          </th>
          <td class="num">${fmt(mapped.length)}</td>
          <td class="num">${fmt(refs)}</td>
          <td class="bar-cell">${meter(mapped.length, total, g.color, `${g.name}: ${mapped.length} of ${total} SCF controls`)}</td>
          <td class="num">${pct(mapped.length, total)}%</td>
        </tr>`;
    }).join("");

    const priority = demoControls
      .filter((c) => c.status === "not-implemented")
      .map((c) => `
        <li>
          <a href="#/controls?open=${encodeURIComponent(c.id)}">
            <span class="ctrl-id">${esc(c.id)}</span>
            <span class="gap-title">${esc(c.scf.scf_control_name)}</span>
            <span class="gap-owner">${esc(c.demo.owner)}</span>
          </a>
        </li>`).join("");

    const domainCounts = DOMAINS
      .map((d) => ({ d, n: CONTROLS.filter((c) => c.scf.scf_domain === d).length }))
      .sort((a, b) => b.n - a.n || a.d.localeCompare(b.d));
    const maxDomain = domainCounts[0] ? domainCounts[0].n : 0;
    const domainRows = domainCounts.map(({ d, n }) => `
      <li>
        <a class="domain-name" href="#/controls?domain=${encodeURIComponent(d)}">${esc(d)}</a>
        <span class="domain-count">${n}</span>
        ${meter(n, maxDomain, "var(--accent)", `${d}: ${n} controls`)}
      </li>`).join("");

    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">${esc(meta.source)} ${esc(meta.version)} · ${esc(DEMO.meta.engagement)}</p>
        </div>
        <a class="btn btn-primary" href="#/controls">Open controls</a>
      </header>

      <section class="kpis" aria-label="Key figures">
        ${kpis.map((k) => `
          <div class="card kpi${k.tone ? " kpi-" + k.tone : ""}">
            <span class="kpi-label">${esc(k.label)}${k.demo ? demoTag : ""}</span>
            <span class="kpi-value">${esc(k.value)}</span>
            <span class="kpi-sub">${esc(k.sub)}</span>
          </div>`).join("")}
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Framework coverage in the SCF</h2>
          <span class="muted small">SCF controls with at least one mapping to each group · select a group to filter</span>
        </div>
        <div class="table-wrap">
          <table class="fw-table">
            <thead>
              <tr>
                <th scope="col">Framework group</th>
                <th scope="col" class="num">SCF controls</th>
                <th scope="col" class="num">References</th>
                <th scope="col">Share of SCF controls</th>
                <th scope="col" class="num">Share</th>
              </tr>
            </thead>
            <tbody>${groupRows}</tbody>
          </table>
        </div>
      </section>

      <section class="card demo-card">
        <div class="card-head">
          <h2>Assessment status ${demoTag}</h2>
          <span class="muted small">${esc(DEMO.meta.assessmentPeriod)} · ${demoControls.length} SCF controls in the demo assessment scope</span>
        </div>
        ${stackedBar(demoCounts, demoControls.length, "Demo assessment status breakdown", "stacked-lg")}
        <ul class="legend">
          ${DEMO.statuses.map((s) => `
            <li><span class="dot status-${s.id}"></span>${esc(s.label)} <strong>${demoCounts[s.id]}</strong></li>`).join("")}
        </ul>
        <p class="hint">The SCF file contains no assessment data. The other ${fmt(total - demoControls.length)} SCF controls are shown as “Not assessed”.</p>
      </section>

      <div class="grid-2">
        <section class="card demo-card">
          <div class="card-head">
            <h2>Priority gaps ${demoTag}</h2>
            <span class="muted small">Not implemented</span>
          </div>
          ${priority ? `<ul class="gap-list">${priority}</ul>` : `<p class="empty">No controls are marked as not implemented.</p>`}
        </section>
        <section class="card">
          <div class="card-head">
            <h2>SCF domains</h2>
            <span class="muted small">${DOMAINS.length} domains · controls per domain</span>
          </div>
          <ul class="domain-list">${domainRows}</ul>
        </section>
      </div>
    `;
  }

  /* ---------- controls ---------- */

  function renderControls(params) {
    document.title = "Controls — DATADEFENZ GRC";
    const state = {
      q: params.get("q") || "",
      fw: new Set((params.get("fw") || "").split(",").filter((id) => GROUP_BY_ID[id])),
      status: STATUS_BY_ID[params.get("status")] ? params.get("status") : "",
      domain: DOMAINS.includes(params.get("domain")) ? params.get("domain") : "",
      limit: PAGE_SIZE
    };
    const openId = params.get("open");
    if (openId) expanded.add(openId);

    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Unified controls</h1>
          <p class="muted">Each SCF control appears once. Expand a control to see its framework mappings, assessment status and evidence notes.</p>
        </div>
      </header>

      <section class="card toolbar" aria-label="Filters">
        <div class="toolbar-row">
          <label class="search">
            <span class="visually-hidden">Search controls</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
            <input id="f-q" type="search" placeholder="Search by SCF ID, name, description or mapping ID…" value="${esc(state.q)}">
          </label>
          <label class="select">
            <span>Status (demo)</span>
            <select id="f-status">
              <option value="">All statuses</option>
              ${DEMO.statuses.map((s) => `<option value="${s.id}"${state.status === s.id ? " selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
          </label>
          <label class="select">
            <span>SCF domain</span>
            <select id="f-domain">
              <option value="">All domains</option>
              ${DOMAINS.map((d) => `<option value="${esc(d)}"${state.domain === d ? " selected" : ""}>${esc(d)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="chips" role="group" aria-label="Framework group filters">
          <span class="chips-label">Framework groups</span>
          <button type="button" class="chip chip-all" data-fw="" aria-pressed="${state.fw.size === 0}">All</button>
          ${GROUPS.map((g) => `
            <button type="button" class="chip" data-fw="${esc(g.id)}" style="--fw:${g.color}"
              aria-pressed="${state.fw.has(g.id)}" title="${esc(g.source_names.join(", "))}">${esc(g.name)}</button>`).join("")}
        </div>
      </section>

      <div class="list-head">
        <p id="result-count" class="muted" aria-live="polite"></p>
        <div class="list-actions">
          <button type="button" class="btn btn-ghost" id="expand-all">Expand shown</button>
          <button type="button" class="btn btn-ghost" id="collapse-all">Collapse all</button>
          <button type="button" class="btn btn-ghost" id="clear-filters">Clear filters</button>
        </div>
      </div>

      <div id="control-list" class="control-list"></div>
      <div id="list-more" class="list-more"></div>
    `;

    const qInput = document.getElementById("f-q");
    const listEl = document.getElementById("control-list");
    const moreEl = document.getElementById("list-more");

    function filtered() {
      const q = state.q.trim().toLowerCase();
      return CONTROLS.filter((c) => {
        if (state.fw.size && ![...state.fw].some((id) => c.byGroup[id])) return false;
        if (state.status && c.status !== state.status) return false;
        if (state.domain && c.scf.scf_domain !== state.domain) return false;
        if (q && !c.haystack.includes(q)) return false;
        return true;
      });
    }

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.fw.size) p.set("fw", [...state.fw].join(","));
      if (state.status) p.set("status", state.status);
      if (state.domain) p.set("domain", state.domain);
      const qs = p.toString();
      history.replaceState(null, "", "#/controls" + (qs ? "?" + qs : ""));
    }

    function renderPanel(c) {
      const s = c.scf;
      const mappingRows = c.groups.map((gid) => {
        const g = GROUP_BY_ID[gid];
        const entries = c.byGroup[gid].map((m) => `
          <div class="mapping">
            <div class="mapping-source" title="${esc(m.focal_document_name)}">${esc(m.framework)}</div>
            <div class="mapping-ids">${m.ids.map((id) => `<code>${esc(id)}</code>`).join(" ")}</div>
          </div>`).join("");
        return `
          <div class="mapping-group${state.fw.has(gid) ? " is-active" : ""}">
            <div class="mapping-group-name"><span class="fw-swatch" style="--fw:${g.color}"></span>${esc(g.name)}</div>
            <div>${entries}</div>
          </div>`;
      }).join("");

      const d = c.demo;
      const assessment = d
        ? `<dl class="assessment">
             <div><dt>Status</dt><dd>${statusBadge(d.status, false)}</dd></div>
             <div><dt>Control owner</dt><dd>${esc(d.owner)}</dd></div>
             <div><dt>Last assessed</dt><dd>${formatDate(d.lastAssessed)}</dd></div>
           </dl>
           <p class="assessor-note">${esc(d.note)}</p>`
        : `<dl class="assessment">
             <div><dt>Status</dt><dd>${statusBadge("not-assessed", false)}</dd></div>
           </dl>
           <p class="empty">Not in the demo assessment scope.</p>`;

      const evidence = d && d.evidence.length
        ? `<ul class="evidence">${d.evidence.map((e) => `
            <li>
              <div class="evidence-top"><strong>${esc(e.name)}</strong><span class="ev-type">${esc(e.type)}</span></div>
              <p>${esc(e.note)}</p>
            </li>`).join("")}</ul>`
        : `<p class="empty">No evidence recorded.</p>`;

      return `
        <div class="scf-text">
          <p class="control-desc">${esc(s.description)}</p>
          <p class="control-question"><span>SCF control question</span>${esc(s.control_question)}</p>
        </div>
        <div class="panel-grid">
          <section class="mappings-section">
            <h3>Framework mappings <span class="count">${c.refCount}</span></h3>
            ${mappingRows}
            <p class="hint">Source: ${esc(SCF.metadata.source)} ${esc(SCF.metadata.version)}, ${esc(SCF.metadata.license)}. Identifiers shown as supplied.</p>
          </section>
          <section class="demo-section">
            <h3>Assessment ${demoTag}</h3>
            ${assessment}
          </section>
          <section class="demo-section">
            <h3>Evidence notes ${demoTag}</h3>
            ${evidence}
          </section>
        </div>`;
    }

    function renderControl(c) {
      const isOpen = expanded.has(c.id);
      const tags = c.groups.map((id) => groupTag(id, state.fw.has(id))).join("");
      const panelId = "panel-" + c.id.replace(/[^A-Za-z0-9_-]/g, "_");
      return `
        <article class="control${isOpen ? " is-open" : ""}" data-id="${esc(c.id)}">
          <button type="button" class="control-summary" aria-expanded="${isOpen}" aria-controls="${esc(panelId)}">
            <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
            <span class="control-main">
              <span class="control-title-row">
                <span class="ctrl-id">${esc(c.id)}</span>
                <span class="control-title">${esc(c.scf.scf_control_name)}</span>
              </span>
              <span class="control-meta">
                <span class="domain">${esc(c.scf.scf_domain)}</span>
                <span class="fw-tags">${tags}</span>
              </span>
            </span>
            ${statusBadge(c.status, Boolean(c.demo))}
          </button>
          <div class="control-panel" id="${esc(panelId)}" ${isOpen ? "" : "hidden"}>${isOpen ? renderPanel(c) : ""}</div>
        </article>`;
    }

    function update() {
      const items = filtered();
      const shown = items.slice(0, state.limit);
      const groupNames = [...state.fw].map((id) => GROUP_BY_ID[id].name);
      document.getElementById("result-count").textContent =
        `${fmt(items.length)} of ${fmt(CONTROLS.length)} SCF controls` +
        (groupNames.length ? ` mapped to ${groupNames.join(" or ")}` : "") +
        (items.length > shown.length ? ` · showing first ${fmt(shown.length)}` : "");
      listEl.innerHTML = shown.length
        ? shown.map(renderControl).join("")
        : `<div class="card empty-state"><p>No controls match these filters.</p></div>`;
      const remaining = items.length - shown.length;
      moreEl.innerHTML = remaining > 0
        ? `<button type="button" class="btn btn-ghost" id="show-more">Show ${fmt(Math.min(PAGE_SIZE, remaining))} more (${fmt(remaining)} remaining)</button>`
        : "";
      view.querySelectorAll(".chip").forEach((chip) => {
        const id = chip.dataset.fw;
        chip.setAttribute("aria-pressed", String(id ? state.fw.has(id) : state.fw.size === 0));
      });
      syncUrl();
    }

    function resetPaging() { state.limit = PAGE_SIZE; }

    qInput.addEventListener("input", () => { state.q = qInput.value; resetPaging(); update(); });
    document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; resetPaging(); update(); });
    document.getElementById("f-domain").addEventListener("change", (e) => { state.domain = e.target.value; resetPaging(); update(); });

    view.querySelector(".chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const id = chip.dataset.fw;
      if (!id) state.fw.clear();
      else if (state.fw.has(id)) state.fw.delete(id);
      else state.fw.add(id);
      resetPaging();
      update();
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".control-summary");
      if (!btn) return;
      const article = btn.closest(".control");
      const id = article.dataset.id;
      const open = !expanded.has(id);
      const panel = article.querySelector(".control-panel");
      if (open) {
        expanded.add(id);
        if (!panel.innerHTML.trim()) panel.innerHTML = renderPanel(CONTROLS.find((c) => c.id === id));
      } else {
        expanded.delete(id);
      }
      article.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    });

    moreEl.addEventListener("click", (e) => {
      if (!e.target.closest("#show-more")) return;
      state.limit += PAGE_SIZE;
      update();
    });

    document.getElementById("expand-all").addEventListener("click", () => {
      filtered().slice(0, state.limit).forEach((c) => expanded.add(c.id));
      update();
    });
    document.getElementById("collapse-all").addEventListener("click", () => {
      expanded.clear();
      update();
    });
    document.getElementById("clear-filters").addEventListener("click", () => {
      state.q = ""; state.status = ""; state.domain = ""; state.fw.clear();
      resetPaging();
      qInput.value = "";
      document.getElementById("f-status").value = "";
      document.getElementById("f-domain").value = "";
      update();
    });

    // Make sure a linked control is within the rendered page.
    if (openId) {
      const index = filtered().findIndex((c) => c.id === openId);
      if (index >= state.limit) state.limit = Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE;
    }

    update();

    if (openId) {
      const target = listEl.querySelector(`[data-id="${CSS.escape(openId)}"]`);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
    }
  }

  /* ---------- start ---------- */

  fetch(SCF_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${SCF_URL}`);
      return res.json();
    })
    .then((data) => {
      prepare(data);
      window.addEventListener("hashchange", render);
      render();
    })
    .catch(showLoadError);
})();
