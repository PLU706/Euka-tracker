let records = JSON.parse(localStorage.getItem("records") || "[]");
let chartInstance = null;

window.onload = () => {
  renderTable();
  drawChart();
};

document.getElementById("imageInput").addEventListener("change", uploadImage);

async function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) return;

  document.getElementById("loading").style.display = "block";

  const base64 = await toBase64(file);

  const res = await fetch("/api/parse", {
    method: "POST",
    body: JSON.stringify({ image: base64 })
  });

  const data = await res.json();

  document.getElementById("loading").style.display = "none";

  if (!data.rows) {
    alert("解析失败");
    return;
  }

  records = records.concat(data.rows);
  localStorage.setItem("records", JSON.stringify(records));

  renderTable();
  drawChart();
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  records.forEach((r, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${r.subject || "—"}</td>
        <td>${r.term || "—"}</td>
        <td>${r.course || "—"}</td>
        <td>${r.lesson || "—"}</td>
        <td>${r.content || "—"}</td>
        <td>${r.score || "—"}</td>
        <td><button onclick="deleteRecord(${i})">删除</button></td>
      </tr>
    `;
  });
}

function deleteRecord(i) {
  records.splice(i, 1);
  localStorage.setItem("records", JSON.stringify(records));
  renderTable();
  drawChart();
}

function drawChart() {
  const ctx = document.getElementById("chart");

  if (chartInstance) chartInstance.destroy();

  // 按科目分组，每个科目一条折线
  const subjectMap = {};
  records.forEach((r, i) => {
    const subj = r.subject || "未知";
    const score = parseFloat(r.score);
    if (isNaN(score)) return;
    if (!subjectMap[subj]) subjectMap[subj] = [];
    subjectMap[subj].push({ index: i, score });
  });

  const colors = ["#4a90d9", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c", "#1abc9c"];
  const subjects = Object.keys(subjectMap);

  const datasets = subjects.map((subj, si) => ({
    label: subj,
    data: subjectMap[subj].map(d => d.score),
    borderColor: colors[si % colors.length],
    backgroundColor: colors[si % colors.length] + "22",
    tension: 0.3,
    pointRadius: 5
  }));

  // 用最长科目的记录数作为 X 轴
  const maxLen = Math.max(...subjects.map(s => subjectMap[s].length));
  const labels = Array.from({ length: maxLen }, (_, i) => "第" + (i + 1) + "次");

  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: true } },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: v => v + "%" }
        }
      }
    }
  });
}

function generateReport() {
  const div = document.getElementById("report");
  div.innerHTML = "";

  if (records.length === 0) {
    div.innerHTML = "暂无数据";
    return;
  }

  // 按科目分组
  const subjectMap = {};
  records.forEach(r => {
    const subj = r.subject || "未知";
    if (!subjectMap[subj]) subjectMap[subj] = [];
    subjectMap[subj].push(r);
  });

  let html = "";

  Object.entries(subjectMap).forEach(([subj, recs]) => {
    const scores = recs.map(r => parseFloat(r.score)).filter(s => !isNaN(s));
    if (scores.length === 0) return;

    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const trend = scores.length > 1
      ? (scores[scores.length - 1] >= scores[0] ? "📈 上升" : "📉 下降")
      : "—";

    // 收集 AI 返回的薄弱点和建议（来自 parse.js 识别结果）
    const weakSet = new Set();
    const suggSet = new Set();
    recs.forEach(r => {
      (r.weak_points || []).forEach(w => weakSet.add(w));
      (r.suggestions || []).forEach(s => suggSet.add(s));
    });

    // 兜底：如果 AI 没有返回薄弱点，根据成绩给通用建议
    if (suggSet.size === 0) {
      if (parseFloat(avg) < 70) {
        suggSet.add("平均分低于70%，建议重点复习本科目基础概念");
      }
      if (trend === "📉 下降") {
        suggSet.add("成绩呈下降趋势，建议复盘近期错题，找出知识漏洞");
      }
      if (parseFloat(avg) >= 85) {
        suggSet.add("整体表现优秀，可适当挑战更高难度的练习");
      }
    }

    html += `
      <div style="margin-bottom:24px; padding:16px; border:1px solid #ddd; border-radius:8px;">
        <h3>📚 ${subj}</h3>
        <p>共 ${recs.length} 条记录 &nbsp;|&nbsp; 平均成绩：<strong>${avg}%</strong> &nbsp;|&nbsp; 趋势：${trend}</p>

        <h4>⚠️ 薄弱点</h4>
        <ul>
          ${weakSet.size > 0
            ? [...weakSet].map(w => `<li>${w}</li>`).join("")
            : "<li>暂无明显薄弱点</li>"}
        </ul>

        <h4>💡 学习建议</h4>
        <ul>
          ${[...suggSet].map(s => `<li>${s}</li>`).join("")}
        </ul>
      </div>
    `;
  });

  div.innerHTML = html;
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
  });
}
