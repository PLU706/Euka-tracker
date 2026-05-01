let records = JSON.parse(localStorage.getItem("records") || "[]");
let reportCache = JSON.parse(localStorage.getItem("reportCache") || "{}");
let chartInstance = null;
let lastReportData = null;

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

  // ✅ ⭐ 关键修改：统一科目
  const fixedRows = data.rows.map(r => ({
    ...r,
    subject: normalizeSubject(r.subject, r.term)
  }));

  records = records.concat(fixedRows);

  localStorage.setItem("records", JSON.stringify(records));

  reportCache = {};
  localStorage.setItem("reportCache", JSON.stringify(reportCache));

  populateFilters();
  renderTable();
  drawChart();
}

// ─── ⭐ 科目标准化（核心新增） ─────────────────────────
function normalizeSubject(subject, termText) {
  // 优先从 TERM 行提取
  if (termText) {
    const m = termText.match(/TERM\s*\d+\s*\/\s*WEEK\s*\d+\s*\/\s*([A-Z]+)/i);
    if (m) subject = m[1];
  }

  if (!subject) return "Unknown";

  const s = subject.toLowerCase();

  if (s.includes("math")) return "Mathematics";
  if (s.includes("english")) return "English";
  if (s.includes("science")) return "Science";

  return subject;
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

// ─── 记录表 ────────────────────────────────────────────
function renderTable() {
  const subj = document.getElementById("filterSubject").value;
  const term = document.getElementById("filterTerm").value;
  const week = document.getElementById("filterWeek").value;

  const filtered = records.filter(r => {
    if (subj && r.subject !== subj) return false;
    if (term && !r.term?.includes(term)) return false;
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
      <td><b>${r.subject||"—"}</b></td>
      <td>${r.term||"—"}</td>
      <td>${r.course||"—"}</td>
      <td>${r.lesson||"—"}</td>
      <td style="font-size:12px">${r.content||"—"}</td>
      <td>${r.score!=null?r.score+"%":"—"}</td>
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
  if (chartInstance) chartInstance.destroy();

  const subjects = [...new Set(records.map(r=>r.subject))];
  const labels = records.map((_,i)=>"记录"+(i+1));

  const datasets = subjects.map((subj, i) => ({
    label: subj,
    data: records.filter(r=>r.subject===subj).map(r=>parseFloat(r.score)),
    borderColor: ["#4a90d9","#e67e22","#2ecc71","#9b59b6"][i%4],
    tension:0.3
  }));

  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: { responsive:true }
  });
}

// ─── 工具 ──────────────────────────────────────────────
function toBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
  });
}
