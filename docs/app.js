const WEEKDAYS_GR = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const MONTHS_GR = ["Ιανουαρίου","Φεβρουαρίου","Μαρτίου","Απριλίου","Μαΐου","Ιουνίου",
                    "Ιουλίου","Αυγούστου","Σεπτεμβρίου","Οκτωβρίου","Νοεμβρίου","Δεκεμβρίου"];

let LOG_DATA = [];

function statusClass(statusText) {
  const s = statusText.toUpperCase();
  if (s.includes("ΕΝ ΠΛΩ")) return "st-enplo";
  if (s.includes("BLACK")) return "st-black";
  if (s.includes("ΒΑΡΔΙΑ")) return "st-vardia";
  if (s.includes("ΚΑ") || s.includes("ΑΜΔ") || s.includes("ΑΝΑΡ")) return "st-adeia";
  if (s.includes("ΑΠΟΣΠΑΣΗ")) return "st-apospasi";
  if (s.includes("ΕΚΤΕΛΕΣΗ ΕΡΓΟΥ")) return "st-ergou";
  if (s.includes("ΑΡΓΙΑ")) return "st-argia";
  return "st-endon";
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateHeader(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  const weekday = WEEKDAYS_GR[(d.getDay() + 6) % 7];
  return `${weekday} ${d.getDate()} ${MONTHS_GR[d.getMonth()]}`;
}

function renderDaily(daily) {
  const container = document.getElementById("dailyRoster");
  const empty = document.getElementById("dailyEmpty");
  container.innerHTML = "";

  if (!daily || !daily.entries || daily.entries.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  document.getElementById("todayDate").textContent = formatDateHeader(daily.date);

  for (const entry of daily.entries) {
    const row = document.createElement("div");
    row.className = `roster-row ${statusClass(entry.status)}`;

    const regTags = (entry.reg_nos || [])
      .map(r => `<span class="reg-tag">ΠΡΩΤ: ${escapeHtml(r)}</span>`).join(" ");

    row.innerHTML = `
      <div class="name">${escapeHtml(entry.name)}
        ${entry.note ? `<span class="note">${escapeHtml(entry.note)}</span>` : ""}
      </div>
      <span class="status-chip">${escapeHtml(entry.status)}</span>
      ${regTags}
    `;
    container.appendChild(row);
  }
}

function renderPending(list) {
  const container = document.getElementById("pendingList");
  const empty = document.getElementById("pendingEmpty");
  const badge = document.getElementById("pendingBadge");
  container.innerHTML = "";

  badge.textContent = list && list.length ? list.length : "";

  if (!list || list.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const r of list) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${escapeHtml(r.crew_name)}</span>
        <span class="card-date">${escapeHtml(r.d_sub)}</span>
      </div>
      <div class="card-type">${escapeHtml(r.type)}</div>
      <div class="card-content">${escapeHtml(r.content)}</div>
    `;
    container.appendChild(card);
  }
}

function renderLog(list) {
  const container = document.getElementById("logList");
  const empty = document.getElementById("logEmpty");
  container.innerHTML = "";

  if (!list || list.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const r of list) {
    const card = document.createElement("div");
    card.className = "card" + (r.deleted ? " deleted" : "");
    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${escapeHtml(r.status_icon)} ${escapeHtml(r.crew_name)}</span>
        <span class="card-date">${escapeHtml(r.d_sub)}</span>
      </div>
      <div class="card-type">${escapeHtml(r.type)}</div>
      <div class="card-content">${escapeHtml(r.content)}</div>
      <div class="card-meta">
        <span>ΠΡΩΤ: ${escapeHtml(r.reg_no || "—")}</span>
        ${r.d_app ? `<span>ΕΓΚΡΙΣΗ: ${escapeHtml(r.d_app)}</span>` : ""}
      </div>
    `;
    container.appendChild(card);
  }
}

function applyLogFilter(query) {
  const q = query.trim().toUpperCase();
  if (!q) { renderLog(LOG_DATA); return; }
  const filtered = LOG_DATA.filter(r =>
    (r.crew_name || "").toUpperCase().includes(q) ||
    (r.type || "").toUpperCase().includes(q) ||
    (r.content || "").toUpperCase().includes(q)
  );
  renderLog(filtered);
}

function setupTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

function updateSyncIndicator(data) {
  const dot = document.getElementById("syncDot");
  const line = document.getElementById("updatedLine");

  const exported = data.export_timestamp ? new Date(data.export_timestamp) : null;
  const dbModified = data.db_last_modified || "άγνωστο";

  let text = `Βάση: ${dbModified}`;
  if (exported) {
    text += ` · Ανέβηκε: ${exported.toLocaleString("el-GR")}`;
    const hoursOld = (Date.now() - exported.getTime()) / 36e5;
    dot.className = "sync-dot" + (hoursOld > 24 ? " stale" : "");
  } else {
    dot.className = "sync-dot stale";
  }
  line.textContent = text;
}

async function loadData() {
  try {
    const resp = await fetch("data.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    updateSyncIndicator(data);
    renderDaily(data.daily_report);
    renderPending(data.pending_signature);
    LOG_DATA = data.report_log || [];
    renderLog(LOG_DATA);
  } catch (err) {
    document.getElementById("syncDot").className = "sync-dot error";
    document.getElementById("updatedLine").textContent = "Σφάλμα φόρτωσης δεδομένων.";
    document.getElementById("todayDate").textContent = "—";
    console.error(err);
  }
}

setupTabs();
document.getElementById("logSearch").addEventListener("input", (e) => applyLogFilter(e.target.value));
loadData();
