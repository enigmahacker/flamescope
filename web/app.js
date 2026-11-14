/* Microgravity Fire Atlas: static dashboard over window.DATA (built by scripts/export.py). No network calls. */
(() => {
  const D = window.DATA;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const runs = Object.fromEntries(D.runs.map((r) => [r.run_id, r]));
  const chunks = Object.fromEntries(D.chunks.map((c) => [c.chunk_id, c]));
  const docs = Object.fromEntries(D.manifest.map((d) => [d.doc_id, d]));
  const complete = (r) => D.required.every((k) => String(r[k] || "").trim());
  const STOP = new Set(D.stopwords);
  const terms = (t) => (String(t).toLowerCase().match(/[a-z0-9]+(?:[.\-/][a-z0-9]+)*/g) || []).filter((w) => !STOP.has(w));
  const statusOf = (r) => (complete(r) ? r.verification_status : "excluded");
  const PLAT = { shuttle: "Space Shuttle", iss: "International Space Station", cygnus: "Cygnus (free-flyer)", drop_tower: "Drop tower", parabolic_flight: "Parabolic flight" };
  const platColor = (p) => `var(--p-${["shuttle", "iss", "cygnus"].includes(p) ? p : "other"})`;
  const badge = (s) => `<span class="badge b-${esc(s)}">${esc(String(s).replace(/_/g, " "))}</span>`;
  const url = (u) => (/^https:\/\//.test(u || "") ? esc(u) : "#");  // source links: https only, never javascript: etc.
  const cite = (id) => `<button type="button" class="cite" data-cite="${esc(id)}">${esc(id)}</button>`;

  /* ---------- BM25 (same tokenizer and parameters as scripts/build.py) ---------- */
  function bm25(index, q, k) {
    const qt = [...new Set(terms(q))];
    const out = index.docs.map((d) => {
      let s = 0;
      for (const t of qt) {
        const f = d.tf[t];
        if (!f) continue;
        const df = index.df[t];
        const idf = Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
        s += (idf * f * (index.k1 + 1)) / (f + index.k1 * (1 - index.b + (index.b * d.len) / index.avgdl));
      }
      return [s, d.chunk_id];
    });
    return out.filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, k);
  }
  // Run records are indexed in the browser so table rows are retrievable too.
  const runText = (r) => [r.run_id, r.experiment, r.mission, r.sample, r.fuel, r.fuel_geometry, PLAT[r.platform] || r.platform, r.flow_condition, r.outcome, r.outcome_notes].join(" ");
  const runIndex = (() => {
    const docsI = D.runs.map((r) => {
      const tf = {};
      for (const t of terms(runText(r))) tf[t] = (tf[t] || 0) + 1;
      return { chunk_id: r.run_id, tf, len: Object.values(tf).reduce((a, b) => a + b, 0) };
    });
    const df = {};
    for (const d of docsI) for (const t in d.tf) df[t] = (df[t] || 0) + 1;
    return { k1: D.bm25.k1, b: D.bm25.b, n: docsI.length, avgdl: docsI.reduce((a, d) => a + d.len, 0) / docsI.length, df, docs: docsI };
  })();

  /* ---------- KPIs ---------- */
  const count = (f) => D.runs.filter(f).length;
  const kpis = [
    ["Sources", D.manifest.length],
    ["Runs in table", D.runs.length],
    ["Verified", count((r) => r.verification_status === "checked_against_source" && complete(r))],
    ["Pending check", count((r) => r.verification_status === "unverified" && complete(r))],
    ["Excluded (missing field)", count((r) => !complete(r))],
    ["Conflicts", count((r) => r.verification_status === "conflict_found")],
    ["Passages", D.chunks.length],
  ];
  $("#kpis").innerHTML = kpis.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#snap").textContent = D.generated;

  /* ---------- Tabs ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function show(tab) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    history.replaceState(null, "", "#" + tab.id.slice(2));
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; show(n); n.focus(); }
    });
  });
  const start = tabs.find((t) => "#" + t.id.slice(2) === location.hash);
  if (start) show(start);

  /* ---------- Citation drawer ---------- */
  const dlg = $("#drawer");
  $("#drawer-close").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cite]");
    if (b) openCite(b.dataset.cite);
  });
  function openCite(id) {
    let title = id, body = "";
    if (runs[id]) {
      const r = runs[id], d = docs[r.doc_id];
      title = `${id} · ${r.experiment} ${r.sample ? "sample " + r.sample : ""}`;
      const keys = ["verification_status", "mission", "platform", "fuel", "fuel_dimension_as_reported", "o2_fraction_pct", "o2_as_reported", "total_pressure_kpa", "pressure_as_reported", "flow_condition", "flow_velocity_m_s", "spread_rate_mm_s", "spread_rate_as_reported", "outcome", "outcome_notes", "source_location", "data_quality_flag", "extraction_method"];
      body = `<p>${badge(statusOf(r))} ${complete(r) ? "" : "<span class='note'>Missing a required field, so excluded from ranking.</span>"}</p>
        <dl>${keys.filter((k) => r[k]).map((k) => `<dt>${esc(k)}</dt><dd>${esc(r[k])}</dd>`).join("")}</dl>
        <p class="meta" style="margin-top:12px">Source: <a href="${url(r.source_url)}" target="_blank" rel="noopener">${esc(d ? d.title : r.source_url)}</a></p>`;
    } else if (chunks[id]) {
      const c = chunks[id], d = docs[c.doc_id];
      title = `${id} · ${c.section}`;
      body = `<p>${esc(c.text)}</p>
        <p class="meta">${esc(d.title)} · ${esc(c.page_or_paragraph)} · retrieved ${esc(c.date_retrieved)}${c.ai_assisted ? " · OCR cleanup AI-assisted" : ""}${c.chunk_type === "short_excerpt" ? " · short excerpt (copyright)" : ""}</p>
        ${c.run_ids.length ? `<p class="meta">Runs: ${c.run_ids.map(cite).join("")}</p>` : ""}
        <p><a href="${url(c.source_url)}" target="_blank" rel="noopener">Open full source</a>${c.doi ? ` · DOI ${esc(c.doi)}` : ""}</p>`;
    } else if (atm[id]) {
      title = `${id} · ${atm[id].scenario}`;
      body = `<dl>${Object.entries(atm[id]).filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
    } else if (docs[id]) {
      const d = docs[id];
      title = d.title;
      body = `<dl>${Object.entries(d).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
    } else return;
    $("#drawer-title").textContent = title;
    $("#drawer-body").innerHTML = body;
    dlg.showModal();
  }

  /* ---------- Ask (RAG) ---------- */
  const answerable = D.eval.filter((q) => q.type !== "off_topic");
  $("#examples").innerHTML = [answerable[0], answerable[7], answerable[10], answerable[13], answerable[14], answerable[16]]
    .map((q) => `<button type="button" class="chip">${esc(q.question)}</button>`).join("");
  $("#examples").addEventListener("click", (e) => {
    if (!e.target.classList.contains("chip")) return;
    $("#q").value = e.target.textContent;
    ask(e.target.textContent);
  });
  $("#ask").addEventListener("submit", (e) => { e.preventDefault(); ask($("#q").value); });

  function curated(q) {
    const a = new Set(terms(q));
    let best = null, bestJ = 0;
    for (const e of D.eval) {
      const b = new Set(terms(e.question));
      const inter = [...a].filter((t) => b.has(t)).length;
      const j = inter / (a.size + b.size - inter || 1);
      if (j > bestJ) { bestJ = j; best = e; }
    }
    return bestJ >= 0.6 ? best : null;  // near-exact match to a curated question only
  }
  const highlight = (text, q) => {
    const qt = new Set(terms(q));
    return esc(text).replace(/[A-Za-z0-9][A-Za-z0-9.\-/]*/g, (w) => (qt.has(w.toLowerCase()) ? `<mark>${w}</mark>` : w));
  };
  function ask(q) {
    q = q.trim();
    const out = $("#answer");
    if (!q) { out.innerHTML = ""; return; }
    const cur = curated(q);
    const ch = bm25(D.bm25, q, 5);
    const rh = bm25(runIndex, q, 8);
    let html = "";
    if (cur && cur.type === "off_topic" || (!cur && !ch.length && !rh.length)) {
      out.innerHTML = `<div class="panel refuse"><h3>No supported answer</h3><p>The sources in this corpus do not support an answer to this question. The dashboard covers NASA microgravity flame-spread experiments and crew atmosphere targets only.</p></div>`;
      return;
    }
    if (liveKey()) html += `<div id="live" class="panel si"><h3><span class="si-tag">SI · live</span> Asking ${esc(D.llm_model)} on Groq…</h3></div>`;
    const si = cur && D.llm ? D.llm.answers.find((a) => a.id === cur.id) : null;
    if (si) html += siPanel(si, `SI-generated offline by ${D.llm.meta.generator}, ${D.llm.meta.generated_at}. Grounded in retrieved records; every number checked against the run table.`, "SI · offline");
    if (cur) {
      const ids = [...cur.gold_run_ids, ...cur.gold_chunk_ids];
      html += `<div class="panel curated"><h3>${cur.type === "unsupported" ? "What the sources can and cannot say" : "Curated answer"} ${badge(cur.type === "unsupported" ? "unverified" : answerStatus(cur.gold_run_ids))}</h3>
        <p>${esc(cur.gold_answer)}</p>
        <p class="meta">Drafted offline with AI assistance and checked against the run table (${esc(cur.id)}). ${ids.length ? "Cites: " + ids.map(cite).join("") : "No run or passage supports a number here."}</p></div>`;
    }
    if (ch.length) {
      html += `<div class="panel"><h3>Source passages</h3>${ch.map(([, id]) => {
        const c = chunks[id], d = docs[c.doc_id];
        return `<div class="passage"><div class="meta">${cite(id)}<span>${esc(d.title)}</span><span>${esc(c.section)} · ${esc(c.page_or_paragraph)}</span></div><p>${highlight(c.text, q)}</p></div>`;
      }).join("")}</div>`;
    }
    if (rh.length) {
      html += `<div class="panel"><h3>Matching runs</h3>${runTable(rh.map(([, id]) => runs[id]))}</div>`;
    }
    out.innerHTML = html;
    if (liveKey()) liveAnswer(q, ch.map((x) => x[1]), rh.map((x) => x[1]));
  }

  /* ---------- SI answers: shared validation (mirrors scripts/eval.py numbers_ok) ---------- */
  const NUM = /(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g;
  const IDS = /\b(?:FS|C|D)-\d{4}\b|\bATM-[A-Z]+\b/g;
  const atm = Object.fromEntries(D.atmosphere.map((a) => [a.target_id, a]));
  function checkAnswer(a) {
    if (!a.supported) return { status: "refused", problems: [] };
    const cites = [...new Set([...(a.citations || []), ...(String(a.answer).match(IDS) || [])])];
    a.citations = cites;
    const problems = cites.filter((c) => !runs[c] && !chunks[c] && !atm[c]).map((c) => `unknown citation ${c}`);
    if (!cites.length) problems.push("no citations");
    const allowed = new Set();
    for (const rec of [...cites.filter((c) => runs[c]).map((c) => runs[c]), ...D.atmosphere])
      for (const v of Object.values(rec)) for (const n of String(v ?? "").match(NUM) || []) allowed.add(n);
    const bad = (String(a.answer).replace(IDS, "").match(NUM) || []).filter((n) => !allowed.has(n));
    if (bad.length) problems.push(`numbers not in cited rows: ${bad.join(", ")}`);
    return { status: problems.length ? "rejected" : "validated", problems };
  }
  function siPanel(a, note, tag) {
    if (a.status === "refused" || a.refused)
      return `<div class="panel si"><h3><span class="si-tag">${esc(tag)}</span> No supported answer</h3><p>The SI model found no support for this question in the retrieved records.</p><p class="meta">${esc(note)}</p></div>`;
    if (a.status !== "validated")
      return `<div class="panel si refuse"><h3><span class="si-tag">${esc(tag)}</span> Answer withheld</h3><p>The model's answer failed validation (${esc(a.problems.join("; "))}), so it is not shown.</p></div>`;
    return `<div class="panel si"><h3><span class="si-tag">${esc(tag)}</span> SI answer ${badge(answerStatus(a.citations.filter((c) => runs[c])))}</h3>
      <p>${esc(String(a.answer).replace(/\s*\[[^\]]+\]/g, ""))}</p><p class="meta">Cites: ${a.citations.map(cite).join("")}</p><p class="meta">${esc(note)}</p></div>`;
  }

  /* ---------- Live AI mode: visitor's own Groq key, kept in this tab only ---------- */
  let memKey = "";
  const liveKey = () => { try { return sessionStorage.getItem("flamescope_groq_key") || memKey; } catch { return memKey; } };
  function setKey(k) { memKey = k; try { k ? sessionStorage.setItem("flamescope_groq_key", k) : sessionStorage.removeItem("flamescope_groq_key"); } catch { /* storage blocked: memory only */ } keyStatus(); }
  const keyStatus = () => { $("#gkey-status").textContent = liveKey() ? "Live AI mode is on for this tab." : "Live AI mode is off. Offline SI answers and source retrieval still work."; };
  $("#gkey-save").onclick = () => { const k = $("#gkey").value.trim(); if (k) setKey(k); $("#gkey").value = ""; };
  $("#gkey-clear").onclick = () => setKey("");
  keyStatus();
  const RUN_FIELDS = ["experiment", "mission", "sample", "platform", "fuel", "o2_fraction_pct", "total_pressure_kpa", "flow_condition", "flow_velocity_m_s", "spread_rate_mm_s", "outcome", "verification_status"];
  async function liveAnswer(q, chunkIds, runIds) {
    const ctx = [
      ...chunkIds.map((id) => `[${id}] passage (${chunks[id].section}): ${chunks[id].text}`),
      ...runIds.map((id) => `[${id}] run: ` + RUN_FIELDS.filter((k) => runs[id][k]).map((k) => `${k}=${runs[id][k]}`).join("; ")),
      ...D.atmosphere.map((a) => `[${a.target_id}] atmosphere target: ${a.scenario}; total_pressure_kpa=${a.total_pressure_kpa}; o2_fraction_pct=${a.o2_fraction_pct}; status=${a.status}`),
    ].join("\n");
    const slot = () => document.getElementById("live");
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${liveKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: D.llm_model, temperature: 0, max_tokens: 400, response_format: { type: "json_object" },
          messages: [{ role: "system", content: D.llm_prompt.system }, { role: "user", content: D.llm_prompt.user_template.replace("{question}", q).replace("{context}", ctx) }] }),
      });
      if (!r.ok) throw new Error(r.status === 401 ? "the key was rejected (401)" : `Groq returned ${r.status}`);
      const a = JSON.parse((await r.json()).choices[0].message.content);
      Object.assign(a, checkAnswer(a));
      if (slot()) slot().outerHTML = siPanel(a, `SI-generated live by ${D.llm_model} on Groq with your key. Checked in this browser against the run table.`, "SI · live").replace('class="panel si', 'id="live" class="panel si');
    } catch (e) {
      if (slot()) slot().innerHTML = `<h3><span class="si-tag">SI · live</span> Live answer unavailable</h3><p>${esc(e.message)}. Offline answers and sources below still apply.</p>`;
    }
  }
  function answerStatus(ids) {
    const st = new Set(ids.map((i) => runs[i]?.verification_status));
    if (!ids.length) return "source_text_only";
    if (st.has("conflict_found")) return "conflict_found";
    return st.size === 1 && st.has("checked_against_source") ? "verified" : "unverified";
  }

  /* ---------- Run table ---------- */
  function runTable(list) {
    return `<div class="tablewrap"><table><thead><tr><th>Run</th><th>Status</th><th>Experiment</th><th>Mission / sample</th><th>Fuel</th><th>O₂ %</th><th>Pressure kPa</th><th>Flow m/s</th><th>Spread mm/s</th><th>Outcome</th><th>Flags</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td>${cite(r.run_id)}</td><td>${badge(statusOf(r))}</td><td>${esc(r.experiment)}</td><td>${esc([r.mission, r.sample].filter(Boolean).join(" · "))}</td><td>${esc(r.fuel)}</td>
        <td class="num">${esc(r.o2_fraction_pct || "—")}</td><td class="num">${esc(r.total_pressure_kpa || "—")}</td><td class="num">${esc(r.flow_velocity_m_s || "—")}</td><td class="num">${esc(r.spread_rate_mm_s || "—")}</td>
        <td>${esc(r.outcome || "—")}</td><td class="flags">${esc(r.data_quality_flag.replace(/; /g, " · "))}</td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function renderRuns() {
    const st = $("#f-status").value, txt = terms($("#f-text").value);
    const keep = D.runs.filter((r) => {
      if (st === "eligible" && !complete(r)) return false;
      if (st === "excluded" && complete(r)) return false;
      if (["checked_against_source", "unverified", "conflict_found"].includes(st) && r.verification_status !== st) return false;
      const hay = (runText(r) + " " + r.data_quality_flag).toLowerCase();
      return txt.every((t) => hay.includes(t));
    });
    const groups = {};
    for (const r of keep) (groups[r.platform_group] ||= []).push(r);
    $("#runs").innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([g, list]) => `
      <section class="group" data-group="${esc(g)}"><h2><span class="swatch" style="background:${platColor(g)}"></span>${esc(PLAT[g] || g)} <span class="note">${list.length} runs, shown as a separate group</span></h2>
      ${runTable(list.slice(0, 40))}${list.length > 40 ? `<p class="more"><button type="button" class="chip" data-all="${esc(g)}">Show all ${list.length}</button></p>` : ""}</section>`).join("")
      : `<p class="note">No runs match these filters.</p>`;
    for (const b of document.querySelectorAll("[data-all]")) b.onclick = () => {
      b.closest(".group").querySelector(".tablewrap").outerHTML = runTable(groups[b.dataset.all]);
      b.remove();
    };
  }
  $("#f-status").onchange = renderRuns;
  $("#f-text").oninput = renderRuns;
  renderRuns();

  /* ---------- Insights ---------- */
  const qa = ["all", "habitat", "transport", "long-duration"];
  $("#card-filters").innerHTML = `<fieldset class="seg"><legend>Question answered</legend>${qa.map((v, i) => `<label><input type="radio" name="qa" value="${v}" ${i ? "" : "checked"}>${v}</label>`).join("")}</fieldset>`;
  $("#card-filters").onchange = renderCards;
  function renderCards() {
    const v = document.querySelector('input[name="qa"]:checked').value;
    $("#cards").innerHTML = D.cards.filter((c) => v === "all" || c.question_answered === v).map((c) => `
      <article class="card"><div class="meta">${badge(c.status)} <span class="badge b-tag">${esc(c.question_answered)}</span> <span>${esc(c.id)}</span></div>
        <h3>${esc(c.title)}</h3><p>${esc(c.claim)}</p><p class="impl">${esc(c.implication)}</p>
        <div class="cites meta">Cites ${c.citations.map(cite).join("")}</div></article>`).join("");
  }
  renderCards();

  /* ---------- Rank ---------- */
  const T = D.atmosphere;
  $("#targets").innerHTML = T.map((t, i) => `<label><input type="radio" name="tgt" value="${esc(t.target_id)}" ${i ? "" : "checked"}>${esc(t.scenario.split(" (")[0])}</label>`).join("");
  $("#targets").onchange = renderRank;
  $("#preview").onchange = renderRank;
  $("#criteria").textContent = "Provisional ranking: runs closest to the selected target atmosphere first (relative oxygen difference plus log pressure ratio), ties broken by faster measured spread. Replace with the contract ranking criteria when they are delivered.";
  function renderRank() {
    const t = T.find((x) => x.target_id === document.querySelector('input[name="tgt"]:checked').value);
    const preview = $("#preview").checked;
    const tO2 = +t.o2_fraction_pct, tP = +t.total_pressure_kpa;
    const pool = D.runs.filter((r) => complete(r) && r.verification_status !== "conflict_found" && (r.verification_status === "checked_against_source" || preview));
    const dist = (r) => Math.abs(+r.o2_fraction_pct - tO2) / tO2 + Math.abs(Math.log(+r.total_pressure_kpa / tP));
    const ranked = pool.slice().sort((a, b) => dist(a) - dist(b) || (+b.spread_rate_mm_s || 0) - (+a.spread_rate_mm_s || 0));
    let warn = "";
    if (t.status !== "pending_team_lead_confirmation" && t.status !== "confirmed") warn += `<div class="banner bad">This target has no recorded citation (${esc(t.status.replace(/_/g, " "))}). Do not use it for decisions.</div>`;
    else if (t.status !== "confirmed") warn += `<div class="banner warn">Target is cited (${cite(t.source_doc_id)}) but awaiting team lead confirmation.</div>`;
    if (preview) warn += `<div class="banner warn">Preview includes unverified runs. Unverified numbers have not been checked against the source by a second person.</div>`;
    $("#rank-warn").innerHTML = warn;
    $("#ranked").innerHTML = ranked.length ? ranked.map((r) => `<li>${cite(r.run_id)} <strong>${esc(r.experiment)}</strong> ${badge(statusOf(r))}
        <div class="meta">${esc(r.fuel)} · ${esc(r.o2_fraction_pct)}% O₂ · ${esc(r.total_pressure_kpa)} kPa${r.spread_rate_mm_s ? ` · ${esc(r.spread_rate_mm_s)} mm/s` : ""} · ${esc(r.mission || "mission not stated")}</div></li>`).join("")
      : `<li style="padding-left:12px"><strong>No verified runs yet.</strong><div class="meta">Runs enter the ranked view after a second person checks each number against the source. Conflict rows never enter it. Turn on the preview to see pending runs.</div></li>`;
    $("#ranked").style.counterReset = "r";
    drawPlot(t, pool.length ? pool : [], preview);
  }
  function drawPlot(sel, pool, preview) {
    const W = 560, H = 340, m = { l: 46, r: 16, t: 14, b: 40 };
    const pts = D.runs.filter((r) => complete(r) && r.verification_status !== "conflict_found");
    const xs = [...pts.map((r) => +r.total_pressure_kpa), ...T.map((t) => +t.total_pressure_kpa)];
    const ys = [...pts.map((r) => +r.o2_fraction_pct), ...T.map((t) => +t.o2_fraction_pct)];
    const xMax = Math.ceil(Math.max(...xs) / 50) * 50 + 25, yMax = Math.ceil(Math.max(...ys) / 10) * 10 + 5;
    const X = (v) => m.l + (v / xMax) * (W - m.l - m.r), Y = (v) => H - m.b - (v / yMax) * (H - m.t - m.b);
    let g = "";
    for (let v = 0; v <= xMax; v += 50) g += `<line class="axis" x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H - m.b}"/><text x="${X(v)}" y="${H - m.b + 16}" text-anchor="middle">${v}</text>`;
    for (let v = 0; v <= yMax; v += 10) g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    g += `<text x="${(W + m.l) / 2}" y="${H - 6}" text-anchor="middle">Total pressure (kPa)</text><text transform="translate(12 ${H / 2}) rotate(-90)" text-anchor="middle">O₂ (% by volume)</text>`;
    const seen = {};
    for (const r of pts) {
      const k = `${r.total_pressure_kpa}|${r.o2_fraction_pct}|${r.platform}`;
      seen[k] = (seen[k] || 0) + 1;
      const off = (seen[k] - 1) * 5, ver = r.verification_status === "checked_against_source";
      g += `<circle cx="${X(+r.total_pressure_kpa) + off}" cy="${Y(+r.o2_fraction_pct)}" r="6" fill="${ver ? platColor(r.platform) : "var(--panel)"}" stroke="${platColor(r.platform)}" stroke-width="2"><title>${esc(r.run_id)} ${esc(r.experiment)}: ${esc(r.o2_fraction_pct)}% O₂, ${esc(r.total_pressure_kpa)} kPa (${esc(r.verification_status)})</title></circle>`;
    }
    for (const t of T) {
      const on = t.target_id === sel.target_id, x = X(+t.total_pressure_kpa), y = Y(+t.o2_fraction_pct);
      g += `<g opacity="${on ? 1 : 0.45}"><circle class="target" cx="${x}" cy="${y}" r="11" ${t.source_url ? "" : 'stroke-dasharray="3 3"'}/><line class="target" x1="${x - 16}" x2="${x + 16}" y1="${y}" y2="${y}"/><line class="target" x1="${x}" x2="${x}" y1="${y - 16}" y2="${y + 16}"/>
        <text class="tlabel" x="${x + 16}" y="${y - 12}">${esc(t.scenario.split(" (")[0].replace(" surface habitat / lander", ""))}</text></g>`;
    }
    const plats = [...new Set(pts.map((r) => r.platform))];
    $("#plot").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of run oxygen against pressure with mission targets">${g}</svg>
      <div class="legend">${plats.map((p) => `<span><span class="swatch" style="background:${platColor(p)}"></span> ${esc(PLAT[p] || p)}</span>`).join("")}<span>Hollow = unverified · filled = verified · crosshair = mission target (dashed = uncited)</span></div>`;
  }
  renderRank();

  /* ---------- Atmospheres, sources, eval ---------- */
  $("#atm").innerHTML = `<div class="tablewrap"><table><thead><tr><th>Target</th><th>Scenario</th><th>Pressure kPa</th><th>As reported</th><th>O₂ %</th><th>Source</th><th>Status</th><th>Notes</th></tr></thead><tbody>
    ${T.map((t) => `<tr><td>${esc(t.target_id)}</td><td>${esc(t.scenario)}</td><td class="num">${esc(t.total_pressure_kpa)}</td><td>${esc(t.pressure_as_reported)}</td><td class="num">${esc(t.o2_fraction_pct)}</td>
      <td>${t.source_doc_id ? cite(t.source_doc_id) : "—"}</td><td>${badge(t.status === "needs_citation" ? "conflict_found" : "unverified").replace(/>[^<]+</, ">" + esc(t.status.replace(/_/g, " ")) + "<")}</td><td class="flags">${esc(t.notes)}</td></tr>`).join("")}</tbody></table></div>`;

  $("#sources").innerHTML = `<div class="tablewrap"><table><thead><tr><th>Doc</th><th>Title</th><th>Type</th><th>Retrieval</th><th>License / terms</th><th>Seed status</th></tr></thead><tbody>
    ${D.manifest.map((d) => `<tr><td>${cite(d.doc_id)}</td><td><a href="${url(d.source_url)}" target="_blank" rel="noopener">${esc(d.title)}</a>${d.doi ? `<div class="meta">DOI ${esc(d.doi)}</div>` : ""}</td><td>${esc(d.source_type)}</td><td>${esc(d.retrieval_status.replace(/_/g, " "))}</td><td class="flags">${esc(d.license_or_terms)}</td><td>${esc(d.seed_status.replace(/_/g, " "))}</td></tr>`).join("")}</tbody></table></div>`;

  /* ---------- About & SI use ---------- */
  const nasaDocs = D.manifest.map((d) => `<li>${cite(d.doc_id)} <a href="${url(d.source_url)}" target="_blank" rel="noopener">${esc(d.title)}</a> (${esc(d.source_type)}${d.doi ? ", DOI " + esc(d.doi) : ""}). ${esc(d.license_or_terms)}</li>`).join("");
  $("#about").innerHTML = `
    <h2>What Flamescope does</h2>
    <p>Flamescope gathers NASA microgravity flame-spread experiments into one table with one row per run, plus a corpus of source passages. It summarizes them as insight cards, ranks runs against the Moon and Mars cabin atmosphere targets, and answers questions with citations. A run enters the ranking only after a second person has checked its numbers against the source. A question the sources cannot answer gets a refusal, not a guess.</p>
    <h2>How it works</h2>
    <ol><li>Fetch: NASA NTRS reports and NASA Physical Sciences Informatics (PSI) datasets, listed in a source manifest with licenses.</li>
    <li>Extract: run parameters (oxygen, pressure, flow, spread rate, outcome) from paper text and PSI experiment tables, with units converted to kPa, mm/s and m/s and the as-reported value kept alongside.</li>
    <li>Validate: required fields, unit conversions, verification status; incomplete runs are excluded, never ranked low.</li>
    <li>Index: section-based passages plus BM25 keyword retrieval, which runs in your browser.</li>
    <li>Interpret: a Groq-hosted LLM answers questions from retrieved records only. An answer is shown only if every number in it matches a cited run.</li></ol>
    <h2>Use of super intelligence (SI)</h2>
    <ul>
      <li><strong>Code:</strong> the pipeline scripts and this website were written with SI assistance (Claude by Anthropic, via Claude Code) and reviewed by the team.</li>
      <li><strong>Data extraction:</strong> run rows from paper text (marked <code>ai_assisted_extraction_from_ntrs_ocr_text</code>) and OCR clean-up of excerpts (marked <code>ai_assisted: true</code>) were done with SI assistance. Rows from PSI tables were mapped by deterministic script. Every row is <em>unverified</em> until a human checks it.</li>
      <li><strong>Insight cards:</strong> drafted with SI assistance (Claude) and validated by script. Any number not found in the cited rows blocks the card.</li>
      <li><strong>Answers:</strong> panels tagged <span class="si-tag">SI · offline</span> were generated by ${esc(D.llm ? D.llm.meta.generator : "a Groq-hosted LLM (" + D.llm_model + ")")} before publishing. Panels tagged <span class="si-tag">SI · live</span> are generated in your browser with your own key. Curated answers in the evaluation set were drafted with SI assistance from the tables.</li>
      <li><strong>Not SI-generated:</strong> the project idea and challenge approach, the verification rules, and the source data itself. No images, audio or video in this site are SI-generated.</li>
    </ul>
    <h2>NASA data and resources used</h2>
    <ul>${nasaDocs}</ul>
    <p class="note">Two NTRS papers are flagged by NTRS as possibly containing copyrighted material, so Flamescope stores only short excerpts from them and links to the full text. PSI datasets are CC0-1.0 and cited by DOI. Flamescope uses no NASA logos or other NASA branding.</p>
    <h2>Limits</h2>
    <ul><li>No run is verified yet, so the ranked view is empty. Its preview shows pending runs, clearly labeled.</li>
    <li>The PSI tables give no cabin pressure, so those runs are excluded from ranking.</li>
    <li>The corpus has no partial-gravity (lunar or Martian gravity) runs yet.</li>
    <li>The Mars target atmosphere has no citation yet.</li>
    <li>The ranking criteria are provisional.</li></ul>`;

  const R = D.eval_report;
  const per = R ? Object.fromEntries(R.per_question.map((p) => [p.id, p])) : {};
  const pct = (v) => (v == null ? "not scored" : Math.round(v * 100) + "%");
  $("#eval").innerHTML = (R ? `<div class="metrics">
      <div class="panel"><h3>Retrieval hit rate</h3><p>${pct(R.retrieval_hit_rate)} of ${esc(R.retrieval_scored)} questions with a gold passage (BM25, top-5)</p></div>
      <div class="panel"><h3>Off-topic refusal</h3><p>${pct(R.off_topic_refusal_rate)} refused by retrieval alone</p></div>
      <div class="panel"><h3>Number and citation accuracy</h3><p>${R.answers ? `${pct(R.answers.number_accuracy)} numbers · ${pct(R.answers.citation_accuracy)} citations` : "Scored when the ML engineer's generated answers are passed to scripts/eval.py"}</p></div></div>` : "")
    + `<div class="tablewrap"><table><thead><tr><th>ID</th><th>Type</th><th>Question</th><th>Gold answer</th><th>Gold citations</th><th>BM25 result</th></tr></thead><tbody>
    ${D.eval.map((q) => { const p = per[q.id] || {}; const res = p.hit === true || p.refused === true ? badge("verified").replace(/>[^<]+</, ">pass<") : p.hit === false || p.refused === false ? badge("conflict_found").replace(/>[^<]+</, ">miss<") : "—";
      return `<tr><td>${esc(q.id)}</td><td>${esc(q.type)}</td><td>${esc(q.question)}</td><td>${esc(q.gold_answer)}</td><td>${[...q.gold_run_ids, ...q.gold_chunk_ids].map(cite).join("") || "—"}</td><td>${res}</td></tr>`; }).join("")}</tbody></table></div>`;
})();
