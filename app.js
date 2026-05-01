let records = JSON.parse(localStorage.getItem("records") || "[]");

// 页面加载时恢复数据
window.onload = function () {
  renderTable();
};

// 上传图片
async function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) return alert("请选择图片");

  const base64 = await toBase64(file);

  const res = await fetch("/api/parse", {
    method: "POST",
    body: JSON.stringify({ image: base64 })
  });

  const data = await res.json();

  if (!data || !data.rows) {
    alert("解析失败");
    return;
  }

  // ⭐追加而不是覆盖
  records = records.concat(data.rows);

  localStorage.setItem("records", JSON.stringify(records));

  renderTable();
}

// 渲染表格
function renderTable() {
  const tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";

  records.forEach(r => {
    const row = `
      <tr>
        <td>${r.subject || ""}</td>
        <td>${r.term || ""}</td>
        <td>${r.course || ""}</td>
        <td>${r.lesson || ""}</td>
        <td>${r.content || ""}</td>
        <td>${r.score || ""}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// ⭐⭐⭐ 核心报告
function generateReport() {
  const reportDiv = document.getElementById("report");
  reportDiv.innerHTML = "";

  if (records.length === 0) {
    reportDiv.innerHTML = "暂无数据";
    return;
  }

  const subjects = {};

  records.forEach(r => {
    if (!subjects[r.subject]) subjects[r.subject] = [];
    subjects[r.subject].push(r);
  });

  for (let subject in subjects) {
    const data = subjects[subject];

    const scores = data
      .map(d => parseFloat(d.score))
      .filter(s => !isNaN(s));

    const avg = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "0";

    const trend =
      scores.length >= 2 && scores[scores.length - 1] < scores[0]
        ? "下降"
        : "上升/稳定";

    let weaknesses = [];
    let suggestions = [];

    data.forEach(d => {
      const text = (d.content || "").toLowerCase();

      if (text.includes("language") || text.includes("inclusive")) {
        weaknesses.push("语言理解与分析");
        suggestions.push("加强语言模式（inclusive/exclusive）理解");
      }

      if (text.includes("story") || text.includes("legend")) {
        weaknesses.push("阅读理解");
        suggestions.push("提高长文本理解能力");
      }

      if (text.includes("morphem") || text.includes("name")) {
        weaknesses.push("词汇与构词");
        suggestions.push("强化词根词缀训练");
      }
    });

    weaknesses = [...new Set(weaknesses)];
    suggestions = [...new Set(suggestions)];

    if (weaknesses.length === 0) weaknesses.push("暂无明显薄弱点");
    if (suggestions.length === 0) suggestions.push("继续保持");

    reportDiv.innerHTML += `
      <h3>📘 ${subject}</h3>
      <p>📊 平均成绩: ${avg}%</p>
      <p>📉 趋势: ${trend}</p>

      <p>⚠️ 薄弱点:</p>
      <ul>${weaknesses.map(w => `<li>${w}</li>`).join("")}</ul>

      <p>💡 学习建议:</p>
      <ul>${suggestions.map(s => `<li>${s}</li>`).join("")}</ul>

      <hr/>
    `;
  }
}

// base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
  });
}
