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
    body: JSON.stringify({ image: base64, mimeType: file.type })
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

async function generateReport() {
  const div = document.getElementById("report");

  if (records.length === 0) {
    div.innerHTML = "暂无数据";
    return;
  }

  div.innerHTML = "<p style='color:blue'>⏳ AI 正在分析所有记录，请稍等...</p>";

  try {
    const res = await fetch("/api/report", {
      method: "POST",
      body: JSON.stringify({ records })
    });

    const data = await res.json();

    if (data.error) {
      div.innerHTML = "报告生成失败：" + data.error;
      return;
    }

    // 渲染按科目分组的报告
    let html = "";

    (data.subjects || []).forEach(s => {
      const trend = s.trend === "up" ? "📈 上升" : s.trend === "down" ? "📉 下降" : "—";
      html += `
        <div style="margin-bottom:24px; padding:16px; border:1px solid #ddd; border-radius:8px;">
          <h3>📚 ${s.subject}</h3>
          <p>共 ${s.record_count} 条记录 &nbsp;|&nbsp; 平均成绩：<strong>${s.avg_score}%</strong> &nbsp;|&nbsp; 趋势：${trend}</p>

          <h4>⚠️ 持续薄弱点</h4>
          <ul>
            ${(s.persistent_weak || []).length > 0
              ? s.persistent_weak.map(w => `<li>${w}</li>`).join("")
              : "<li>暂无持续薄弱点</li>"}
          </ul>

          <h4>✅ 已掌握内容</h4>
          <ul>
            ${(s.strengths || []).length > 0
              ? s.strengths.map(w => `<li>${w}</li>`).join("")
              : "<li>暂无数据</li>"}
          </ul>

          <h4>💡 针对性建议</h4>
          <ul>
            ${(s.suggestions || []).map(sg => `<li>${sg}</li>`).join("")}
          </ul>
        </div>
      `;
    });

    if (data.overall) {
      html += `
        <div style="padding:16px; background:#f9f9f9; border-radius:8px;">
          <h3>🎯 综合建议</h3>
          <p>${data.overall}</p>
        </div>
      `;
    }

    div.innerHTML = html;

  } catch (e) {
    div.innerHTML = "报告生成失败：" + e.message;
  }
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
  });
}
