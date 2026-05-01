let records = JSON.parse(localStorage.getItem("records") || "[]");
let chartInstance = null;

window.onload = () => {
  populateFilters();
  renderTable();
  drawChart();
  setupReportLevelListener();
};

document.getElementById("imageInput").addEventListener("change", uploadImage);

// ─── 上传识别 ───────────────────────────────────────────
async function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) return;
  document.getElementById("loading").style.display = "block";

  const base64 = await toBase64(file);
  const res = await fetch("/api/parse", {
    method: "POST",
    body: JSON.stringify({ image: base64, mimeType: file.type })
  });
  const data = await res.json();
  document.getElementById("loading").style.display = "none";

  if (!data.rows) { alert("解析失败"); return; }

  records = records.concat(data.rows);
  localStorage.setItem("records", JSON.stringify(records));
  populateFilters();
  renderTable();
  drawChart();
}

// ─── 筛选器填充 ──────────────────────────────────────────
function populateFilters() {
  const subjects = [...new Set(records.map(r => r.subject).filter(Boolean))].sort();
  const terms    = [...new Set(records.map(r => parseTerm(r.term)).filter(Boolean))].sort();
  const weeks    = [...new Set(records.map(r => parseWeek(r.term)).filter(Boolean))].sort((a,b)=>a-b);

  fillSelect("filterSubject", subjects, "全部科目");
  fillSelect("filterTerm",    terms.map(t=>"Term "+t), "全部Term");
  fillSelect("filterWeek",    weeks.map(w=>"Week "+w), "全部Week");
  fillSelect("chartSubject",  subjects, "全部科目");

  const reportTerm = document.getElementById("reportTerm");
  fillSelect("reportTerm", terms.map(t=>"Term "+t), "选择Term");
  fillSelect("reportWeek", weeks.map(w=>"Week "+w), "选择Week");
}

function fillSelect(id, options, placeholder) {
  const el = document.getElementById(id);
  const cur = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    options.map(o => `<option value="${o}" ${o===cur?"selected":""}>${o}</option>`).join("");
}

function parseTerm(term) {
  const m = (term||"").match(/Term\s*(\d)/i);
  return m ? parseInt(m[1]) : null;
}

function parseWeek(term) {
  const m = (term||"").match(/Week\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

// ─── 标签切换 ──────────────────────────────────────────
function showTab(name) {
  ["records","chart","report"].forEach(t => {
    document.getElementById("tab-"+t).style.display = t===name ? "block" : "none";
  });
  document.querySelectorAll(".tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", ["records","chart","report"][i] === name);
  });
  if (name === "chart") drawChart();
}

// ─── 报告层级联动 ─────────────────────────────────────
function setupReportLevelListener() {
  document.getElementById("reportLevel").addEventListener("change", function() {
    const level = this.value;
    document.getElementById("reportTerm").style.display = (level==="week"||level==="term") ? "inline-block" : "none";
    document.getElementById("reportWeek").style.display = level==="week" ? "inline-block" : "none";
  });
}

// ─── 记录表 ────────────────────────────────────────────
function renderTable() {
  const subj = document.getElementById("filterSubject").value;
  const term = document.getElementById("filterTerm").value;
  const week = document.getElementById("filterWeek").value;

  const filtered = records.filter(r => {
    if (subj && r.subject !== subj) return false;
    if (term && !r.term?.includes(term.replace("Term ","Term "))) return false;
    if (week && !r.term?.toLowerCase().includes("week "+week.replace("Week ",""))) return false;
    return true;
  });

  const tbody = document.getElementById("tableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#999">暂无记录</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((r, i) => `
    <tr>
      <td>${r.subject||"—"}</td>
      <td>${r.term||"—"}</td>
      <td>${r.course||"—"}</td>
      <td>${r.lesson||"—"}</td>
      <td style="font-size:12px">${r.content||"—"}</td>
      <td>${r.score!=null&&r.score!==""?r.score+"%":"—"}</td>
      <td><button onclick="deleteRecord(${records.indexOf(r)})">删除</button></td>
    </tr>
  `).join("");
}

function deleteRecord(i) {
  records.splice(i, 1);
  localStorage.setItem("records", JSON.stringify(records));
  populateFilters();
  renderTable();
  drawChart();
}

// ─── 图表 ──────────────────────────────────────────────
function drawChart() {
  const ctx = document.getElementById("chart");
  const groupBy = document.getElementById("chartGroupBy").value;
  const subjFilter = document.getElementById("chartSubject").value;
  if (chartInstance) chartInstance.destroy();

  const filtered = subjFilter ? records.filter(r=>r.subject===subjFilter) : records;
  const subjects = [...new Set(filtered.map(r=>r.subject).filter(Boolean))];
  const colors = ["#4a90d9","#e67e22","#2ecc71","#9b59b6","#e74c3c","#1abc9c","#f39c12","#3498db"];

  let labels = [];
  const datasets = subjects.map((subj, si) => {
    const recs = filtered.filter(r=>r.subject===subj);
    let points = [];

    if (groupBy === "lesson") {
      points = recs.map((r,i)=>({ label:"第"+(i+1)+"课", val: parseFloat(r.score) }));
    } else if (groupBy === "week") {
      const weekMap = {};
      recs.forEach(r=>{
        const t = parseTerm(r.term), w = parseWeek(r.term);
        if (!t||!w) return;
        const key = `T${t}W${w}`;
        if (!weekMap[key]) weekMap[key] = [];
        const s = parseFloat(r.score);
        if (!isNaN(s)) weekMap[key].push(s);
      });
      points = Object.entries(weekMap).sort().map(([k,vals])=>({
        label: k, val: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
      }));
    } else {
      const termMap = {};
      recs.forEach(r=>{
        const t = parseTerm(r.term);
        if (!t) return;
        const key = "Term"+t;
        if (!termMap[key]) termMap[key] = [];
        const s = parseFloat(r.score);
        if (!isNaN(s)) termMap[key].push(s);
      });
      points = Object.entries(termMap).sort().map(([k,vals])=>({
        label: k, val: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
      }));
    }

    if (si === 0) labels = points.map(p=>p.label);
    return {
      label: subj,
      data: points.map(p=>p.val),
      borderColor: colors[si%colors.length],
      backgroundColor: colors[si%colors.length]+"22",
      tension: 0.3, pointRadius: 5
    };
  });

  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: true } },
      scales: { y: { min:0, max:100, ticks:{ callback: v=>v+"%" } } }
    }
  });
}

// ─── 报告生成 ──────────────────────────────────────────
async function generateReport() {
  const level = document.getElementById("reportLevel").value;
  const termVal = document.getElementById("reportTerm").value;
  const weekVal = document.getElementById("reportWeek").value;
  const div = document.getElementById("report");

  // 筛选本层数据
  let filtered = [...records];
  if (level === "week") {
    if (!termVal || !weekVal) { alert("请选择 Term 和 Week"); return; }
    filtered = records.filter(r => r.term?.includes(termVal.replace("Term ","Term ")) && r.term?.toLowerCase().includes("week "+weekVal.replace("Week ","")));
  } else if (level === "term") {
    if (!termVal) { alert("请选择 Term"); return; }
    filtered = records.filter(r => r.term?.includes(termVal.replace("Term ","Term ")));
  }

  if (!filtered.length) { div.innerHTML = "<p>该范围内暂无记录</p>"; return; }

  div.innerHTML = "<p style='color:blue'>⏳ AI 正在分析，请稍等...</p>";

  // 构建发给 AI 的摘要
  let payload;
  if (level === "week") {
    // 直接发原始记录
    payload = { level: "week", label: `${termVal} ${weekVal}`, records: filtered.map(r=>({
      subject: r.subject, lesson: r.lesson, course: r.course,
      score: r.score, weak_points: r.weak_points, suggestions: r.suggestions
    }))};
  } else if (level === "term") {
    // 按周聚合后发摘要
    const weekMap = {};
    filtered.forEach(r => {
      const w = parseWeek(r.term);
      if (!w) return;
      const key = r.subject+"_W"+w;
      if (!weekMap[key]) weekMap[key] = { subject:r.subject, week:"Week "+w, scores:[], weak_points:[] };
      const s = parseFloat(r.score);
      if (!isNaN(s)) weekMap[key].scores.push(s);
      (r.weak_points||[]).forEach(wp => weekMap[key].weak_points.push(wp));
    });
    payload = { level:"term", label: termVal, records: Object.values(weekMap).map(w=>({
      subject: w.subject, week: w.week,
      avg_score: w.scores.length ? Math.round(w.scores.reduce((a,b)=>a+b,0)/w.scores.length) : null,
      weak_points: [...new Set(w.weak_points)]
    }))};
  } else {
    // 按Term聚合后发摘要
    const termMap = {};
    filtered.forEach(r => {
      const t = parseTerm(r.term);
      if (!t) return;
      const key = r.subject+"_T"+t;
      if (!termMap[key]) termMap[key] = { subject:r.subject, term:"Term "+t, scores:[], weak_points:[] };
      const s = parseFloat(r.score);
      if (!isNaN(s)) termMap[key].scores.push(s);
      (r.weak_points||[]).forEach(wp => termMap[key].weak_points.push(wp));
    });
    payload = { level:"year", label:"全年", records: Object.values(termMap).map(t=>({
      subject: t.subject, term: t.term,
      avg_score: t.scores.length ? Math.round(t.scores.reduce((a,b)=>a+b,0)/t.scores.length) : null,
      weak_points: [...new Set(t.weak_points)]
    }))};
  }

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.error) { div.innerHTML = "报告生成失败：" + data.error; return; }
    renderReport(div, data, level, payload.label);
  } catch(e) {
    div.innerHTML = "报告生成失败：" + e.message;
  }
}

function renderReport(div, data, level, label) {
  const levelLabel = { week:"Week", term:"Term", year:"全年" }[level];
  let html = `<h2>${levelLabel} 报告 — ${label}</h2>`;

  (data.subjects||[]).forEach(s => {
    const trend = s.trend==="up"?"📈 上升":s.trend==="down"?"📉 下降":"➡️ 平稳";
    html += `
      <div class="report-section">
        <h3>📚 ${s.subject}</h3>
        <p>平均成绩：<strong>${s.avg_score}%</strong> &nbsp;|&nbsp; 趋势：${trend}</p>
        <h4>⚠️ 薄弱点</h4>
        <ul>${(s.persistent_weak||[]).length ? s.persistent_weak.map(w=>`<li>${w}</li>`).join("") : "<li>暂无明显薄弱点</li>"}</ul>
        <h4>✅ 掌握较好</h4>
        <ul>${(s.strengths||[]).length ? s.strengths.map(w=>`<li>${w}</li>`).join("") : "<li>暂无数据</li>"}</ul>
        <h4>💡 建议</h4>
        <ul>${(s.suggestions||[]).map(sg=>`<li>${sg}</li>`).join("")}</ul>
      </div>`;
  });

  if (data.overall) {
    html += `<div class="overall-box"><h3>🎯 综合建议</h3><p>${data.overall}</p></div>`;
  }
  div.innerHTML = html;
}

// ─── 工具函数 ──────────────────────────────────────────
function toBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
  });
}
