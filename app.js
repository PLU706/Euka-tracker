let records = JSON.parse(localStorage.getItem("records") || "[]");

window.onload = () => {
  renderTable();
  drawChart();
};

// ⭐ 自动上传
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

// 渲染表格
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  records.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.subject}</td>
        <td>${r.term}</td>
        <td>${r.course}</td>
        <td>${r.lesson}</td>
        <td>${r.content}</td>
        <td>${r.score}</td>
      </tr>
    `;
  });
}

// 📈 图表
function drawChart() {
  const ctx = document.getElementById("chart");

  const scores = records.map(r => parseFloat(r.score)).filter(s => !isNaN(s));

  new Chart(ctx, {
    type: "line",
    data: {
      labels: scores.map((_, i) => "记录" + (i+1)),
      datasets: [{
        label: "成绩变化",
        data: scores
      }]
    }
  });
}

// ⭐⭐⭐ AI风格分析（增强版）
function generateReport() {
  const div = document.getElementById("report");
  div.innerHTML = "";

  if (records.length === 0) {
    div.innerHTML = "暂无数据";
    return;
  }

  const scores = records.map(r => parseFloat(r.score)).filter(s => !isNaN(s));

  const avg = (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
  const trend = scores[scores.length-1] < scores[0] ? "下降" : "上升";

  let weak = {};
  let suggestions = [];

  records.forEach(r => {
    const text = (r.content || "").toLowerCase();

    if (text.includes("language")) {
      weak["语言分析能力"] = true;
    }

    if (text.includes("story") || text.includes("legend")) {
      weak["阅读理解能力"] = true;
    }

    if (text.includes("morphem")) {
      weak["词汇与构词能力"] = true;
    }
  });

  // ⭐更智能建议
  if (weak["语言分析能力"]) {
    suggestions.push("加强对语言模式（如inclusive/exclusive）的理解，重点训练概念辨析题");
  }

  if (weak["阅读理解能力"]) {
    suggestions.push("提升长文本阅读能力，练习快速抓主旨与细节定位");
  }

  if (weak["词汇与构词能力"]) {
    suggestions.push("加强词根词缀训练，提高词汇分析能力");
  }

  if (trend === "下降") {
    suggestions.push("近期成绩下降，建议复盘错题，找出知识漏洞");
  }

  div.innerHTML = `
    <h3>📊 总体分析</h3>
    <p>平均成绩：${avg}%</p>
    <p>趋势：${trend}</p>

    <h3>⚠️ 薄弱点</h3>
    <ul>
      ${Object.keys(weak).map(w=>`<li>${w}</li>`).join("") || "<li>暂无明显薄弱点</li>"}
    </ul>

    <h3>💡 学习建议</h3>
    <ul>
      ${suggestions.map(s=>`<li>${s}</li>`).join("")}
    </ul>
  `;
}

// base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
  });
}
