/*
 * DATADEFENZ GRC — prototype front end.
 * Plain JavaScript, no build step. Reads window.GRC_DATA (assets/js/data.js)
 * and renders two views via hash routing: #/dashboard and #/controls.
 */
(function () {
  "use strict";

  const DATA = window.GRC_DATA;
  const FW_BY_ID = Object.fromEntries(DATA.frameworks.map((f) => [f.id, f]));
  const STATUS_BY_ID = Object.fromEntries(DATA.statuses.map((s) => [s.id, s]));
  const DOMAINS = [...new Set(DATA.controls.map((c) => c.domain))].sort();

  const view = document.getElementById("view");
  document.getElementById("sample-banner-text").textContent =
    DATA.meta.note + " Engagement: " + DATA.meta.engagement + ".";

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

  function statusBadge(statusId) {
    const s = STATUS_BY_ID[statusId];
    return `<span class="badge status-${esc(statusId)}"><span class="dot"></span>${esc(s.label)}</span>`;
  }

  function fwTag(fwId, active) {
    const fw = FW_BY_ID[fwId];
    return `<span class="fw-tag${active ? " is-active" : ""}" style="--fw:${fw.color}">${esc(fw.short)}</span>`;
  }

  function countByStatus(controls) {
    const counts = Object.fromEntries(DATA.statuses.map((s) => [s.id, 0]));
    controls.forEach((c) => { counts[c.assessment.status] += 1; });
    return counts;
  }

  function stackedBar(counts, total, label) {
    const segs = DATA.statuses
      .filter((s) => counts[s.id] > 0)
      .map((s) => `<span class="seg status-${s.id}" style="flex:${counts[s.id]}" title="${esc(s.label)}: ${counts[s.id]}"></span>`)
      .join("");
    return `<div class="stacked" role="img" aria-label="${esc(label)}">${total ? segs : ""}</div>`;
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

  window.addEventListener("hashchange", render);

  /* ---------- dashboard ---------- */

  function renderDashboard() {
    document.title = "Dashboard — DATADEFENZ GRC";
    const controls = DATA.controls;
    const counts = countByStatus(controls);
    const applicable = controls.length - counts["not-applicable"];
    const gaps = counts.partial + counts["not-implemented"];
    const evidenceCount = controls.reduce((n, c) => n + c.evidence.length, 0);
    const withoutEvidence = controls.filter(
      (c) => c.evidence.length === 0 && c.assessment.status !== "not-applicable"
    ).length;

    const kpis = [
      { label: "Unified controls", value: controls.length, sub: `${DATA.frameworks.length} frameworks mapped` },
      { label: "Implemented", value: pct(counts.implemented, applicable) + "%", sub: `${counts.implemented} of ${applicable} applicable controls` },
      { label: "Open gaps", value: gaps, sub: `${counts["not-implemented"]} not implemented · ${counts.partial} partial`, tone: "warn" },
      { label: "Evidence items", value: evidenceCount, sub: `${withoutEvidence} applicable control${withoutEvidence === 1 ? "" : "s"} without evidence` }
    ];

    const fwRows = DATA.frameworks.map((fw) => {
      const mapped = controls.filter((c) => c.frameworks[fw.id]);
      const refs = mapped.reduce((n, c) => n + c.frameworks[fw.id].length, 0);
      const fc = countByStatus(mapped);
      const fwApplicable = mapped.length - fc["not-applicable"];
      const score = pct(fc.implemented, fwApplicable);
      return `
        <tr>
          <th scope="row">
            <a class="fw-link" href="#/controls?fw=${fw.id}">
              <span class="fw-swatch" style="--fw:${fw.color}"></span>
              <span><strong>${esc(fw.short)}</strong><small>${esc(fw.name)}</small></span>
            </a>
          </th>
          <td class="num">${mapped.length}</td>
          <td class="num">${refs}</td>
          <td class="bar-cell">${stackedBar(fc, mapped.length, `${fw.short} status breakdown`)}</td>
          <td class="num"><strong>${score}%</strong></td>
        </tr>`;
    }).join("");

    const priority = controls
      .filter((c) => c.assessment.status === "not-implemented")
      .map((c) => `
        <li>
          <a href="#/controls?open=${encodeURIComponent(c.id)}">
            <span class="ctrl-id">${esc(c.id)}</span>
            <span class="gap-title">${esc(c.title)}</span>
            <span class="gap-owner">${esc(c.assessment.owner)}</span>
          </a>
        </li>`).join("");

    const domainRows = DOMAINS.map((d) => {
      const dc = controls.filter((c) => c.domain === d);
      const counts = countByStatus(dc);
      return `
        <li>
          <span class="domain-name">${esc(d)}</span>
          <span class="domain-count">${dc.length}</span>
          ${stackedBar(counts, dc.length, `${d} status breakdown`)}
        </li>`;
    }).join("");

    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">${esc(DATA.meta.engagement)} · ${esc(DATA.meta.assessmentPeriod)}</p>
        </div>
        <a class="btn btn-primary" href="#/controls">Open controls</a>
      </header>

      <section class="kpis" aria-label="Key figures">
        ${kpis.map((k) => `
          <div class="card kpi${k.tone ? " kpi-" + k.tone : ""}">
            <span class="kpi-label">${esc(k.label)}</span>
            <span class="kpi-value">${esc(k.value)}</span>
            <span class="kpi-sub">${esc(k.sub)}</span>
          </div>`).join("")}
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Assessment status</h2>
          <span class="muted small">${controls.length} controls</span>
        </div>
        ${stackedBar(counts, controls.length, "Overall status breakdown").replace('class="stacked"', 'class="stacked stacked-lg"')}
        <ul class="legend">
          ${DATA.statuses.map((s) => `
            <li><span class="dot status-${s.id}"></span>${esc(s.label)} <strong>${counts[s.id]}</strong></li>`).join("")}
        </ul>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Framework coverage</h2>
          <span class="muted small">Select a framework to filter the controls</span>
        </div>
        <div class="table-wrap">
          <table class="fw-table">
            <thead>
              <tr>
                <th scope="col">Framework</th>
                <th scope="col" class="num">Controls</th>
                <th scope="col" class="num">References</th>
                <th scope="col">Status</th>
                <th scope="col" class="num">Implemented</th>
              </tr>
            </thead>
            <tbody>${fwRows}</tbody>
          </table>
        </div>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head">
            <h2>Priority gaps</h2>
            <span class="muted small">Not implemented</span>
          </div>
          ${priority ? `<ul class="gap-list">${priority}</ul>` : `<p class="empty">No controls are marked as not implemented.</p>`}
        </section>
        <section class="card">
          <div class="card-head">
            <h2>By domain</h2>
            <span class="muted small">Controls per domain</span>
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
      fw: new Set((params.get("fw") || "").split(",").filter((id) => FW_BY_ID[id])),
      status: STATUS_BY_ID[params.get("status")] ? params.get("status") : "",
      domain: DOMAINS.includes(params.get("domain")) ? params.get("domain") : ""
    };
    const openId = params.get("open");
    if (openId) expanded.add(openId);

    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Unified controls</h1>
          <p class="muted">Each control appears once. Expand a control to see its framework references, assessment status and evidence notes.</p>
        </div>
      </header>

      <section class="card toolbar" aria-label="Filters">
        <div class="toolbar-row">
          <label class="search">
            <span class="visually-hidden">Search controls</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
            <input id="f-q" type="search" placeholder="Search by ID, title, reference or evidence…" value="${esc(state.q)}">
          </label>
          <label class="select">
            <span>Status</span>
            <select id="f-status">
              <option value="">All statuses</option>
              ${DATA.statuses.map((s) => `<option value="${s.id}"${state.status === s.id ? " selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
          </label>
          <label class="select">
            <span>Domain</span>
            <select id="f-domain">
              <option value="">All domains</option>
              ${DOMAINS.map((d) => `<option value="${esc(d)}"${state.domain === d ? " selected" : ""}>${esc(d)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="chips" role="group" aria-label="Framework filters">
          <span class="chips-label">Frameworks</span>
          <button type="button" class="chip chip-all" data-fw="" aria-pressed="${state.fw.size === 0}">All</button>
          ${DATA.frameworks.map((fw) => `
            <button type="button" class="chip" data-fw="${fw.id}" style="--fw:${fw.color}"
              aria-pressed="${state.fw.has(fw.id)}" title="${esc(fw.name)}">${esc(fw.short)}</button>`).join("")}
        </div>
      </section>

      <div class="list-head">
        <p id="result-count" class="muted" aria-live="polite"></p>
        <div class="list-actions">
          <button type="button" class="btn btn-ghost" id="expand-all">Expand all</button>
          <button type="button" class="btn btn-ghost" id="collapse-all">Collapse all</button>
          <button type="button" class="btn btn-ghost" id="clear-filters">Clear filters</button>
        </div>
      </div>

      <div id="control-list" class="control-list"></div>
    `;

    const qInput = document.getElementById("f-q");
    const listEl = document.getElementById("control-list");

    function filtered() {
      const q = state.q.trim().toLowerCase();
      return DATA.controls.filter((c) => {
        if (state.fw.size && ![...state.fw].some((id) => c.frameworks[id])) return false;
        if (state.status && c.assessment.status !== state.status) return false;
        if (state.domain && c.domain !== state.domain) return false;
        if (q) {
          const haystack = [
            c.id, c.title, c.domain, c.description, c.assessment.owner, c.assessment.note,
            ...Object.values(c.frameworks).flat(),
            ...c.evidence.flatMap((e) => [e.name, e.note])
          ].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
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

    function renderControl(c) {
      const isOpen = expanded.has(c.id);
      const fwIds = DATA.frameworks.map((f) => f.id).filter((id) => c.frameworks[id]);
      const tags = fwIds.map((id) => fwTag(id, state.fw.has(id))).join("");
      const panelId = "panel-" + c.id;

      const refRows = fwIds.map((id) => {
        const fw = FW_BY_ID[id];
        return `
          <tr class="${state.fw.has(id) ? "is-active" : ""}">
            <th scope="row"><span class="fw-swatch" style="--fw:${fw.color}"></span>${esc(fw.short)}</th>
            <td>${c.frameworks[id].map((r) => `<code>${esc(r)}</code>`).join(" ")}</td>
          </tr>`;
      }).join("");

      const evidence = c.evidence.length
        ? `<ul class="evidence">${c.evidence.map((e) => `
            <li>
              <div class="evidence-top"><strong>${esc(e.name)}</strong><span class="ev-type">${esc(e.type)}</span></div>
              <p>${esc(e.note)}</p>
            </li>`).join("")}</ul>`
        : `<p class="empty">No evidence recorded yet.</p>`;

      return `
        <article class="control${isOpen ? " is-open" : ""}" data-id="${esc(c.id)}">
          <button type="button" class="control-summary" aria-expanded="${isOpen}" aria-controls="${esc(panelId)}">
            <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
            <span class="control-main">
              <span class="control-title-row">
                <span class="ctrl-id">${esc(c.id)}</span>
                <span class="control-title">${esc(c.title)}</span>
              </span>
              <span class="control-meta">
                <span class="domain">${esc(c.domain)}</span>
                <span class="fw-tags">${tags}</span>
              </span>
            </span>
            ${statusBadge(c.assessment.status)}
          </button>
          <div class="control-panel" id="${esc(panelId)}" ${isOpen ? "" : "hidden"}>
            <p class="control-desc">${esc(c.description)}</p>
            <div class="panel-grid">
              <section>
                <h3>Framework references</h3>
                <table class="ref-table"><tbody>${refRows}</tbody></table>
                <p class="hint">Illustrative sample mappings — not validated against SCF.</p>
              </section>
              <section>
                <h3>Assessment</h3>
                <dl class="assessment">
                  <div><dt>Status</dt><dd>${statusBadge(c.assessment.status)}</dd></div>
                  <div><dt>Control owner</dt><dd>${esc(c.assessment.owner)}</dd></div>
                  <div><dt>Last assessed</dt><dd>${formatDate(c.assessment.lastAssessed)}</dd></div>
                </dl>
                <p class="assessor-note">${esc(c.assessment.note)}</p>
              </section>
              <section>
                <h3>Evidence notes <span class="count">${c.evidence.length}</span></h3>
                ${evidence}
              </section>
            </div>
          </div>
        </article>`;
    }

    function update() {
      const items = filtered();
      const fwNames = [...state.fw].map((id) => FW_BY_ID[id].short);
      document.getElementById("result-count").textContent =
        `Showing ${items.length} of ${DATA.controls.length} controls` +
        (fwNames.length ? ` mapped to ${fwNames.join(" or ")}` : "");
      listEl.innerHTML = items.length
        ? items.map(renderControl).join("")
        : `<div class="card empty-state"><p>No controls match these filters.</p></div>`;
      view.querySelectorAll(".chip").forEach((chip) => {
        const id = chip.dataset.fw;
        chip.setAttribute("aria-pressed", String(id ? state.fw.has(id) : state.fw.size === 0));
      });
      syncUrl();
    }

    qInput.addEventListener("input", () => { state.q = qInput.value; update(); });
    document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; update(); });
    document.getElementById("f-domain").addEventListener("change", (e) => { state.domain = e.target.value; update(); });

    view.querySelector(".chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const id = chip.dataset.fw;
      if (!id) state.fw.clear();
      else if (state.fw.has(id)) state.fw.delete(id);
      else state.fw.add(id);
      update();
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".control-summary");
      if (!btn) return;
      const article = btn.closest(".control");
      const id = article.dataset.id;
      const open = !expanded.has(id);
      if (open) expanded.add(id); else expanded.delete(id);
      article.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      article.querySelector(".control-panel").hidden = !open;
    });

    document.getElementById("expand-all").addEventListener("click", () => {
      filtered().forEach((c) => expanded.add(c.id));
      update();
    });
    document.getElementById("collapse-all").addEventListener("click", () => {
      expanded.clear();
      update();
    });
    document.getElementById("clear-filters").addEventListener("click", () => {
      state.q = ""; state.status = ""; state.domain = ""; state.fw.clear();
      qInput.value = "";
      document.getElementById("f-status").value = "";
      document.getElementById("f-domain").value = "";
      update();
    });

    update();

    if (openId) {
      const target = listEl.querySelector(`[data-id="${CSS.escape(openId)}"]`);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
    }
  }

  render();
})();
