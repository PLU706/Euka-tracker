const fileInput = document.getElementById("fileInput");
const tableBody = document.getElementById("tableBody");
const reportBox = document.getElementById("report");

// 初始化数据
let records = JSON.parse(localStorage.getItem("records") || "[]");

// 页面加载时渲染
renderTable();

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const base64 = await toBase64(file);

  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64 }),
    });

    const data = await res.json();

    if (data.error) {
      alert("解析失败");
      return;
    }

    // ✅ 新增记录（关键！）
    records.push(data);

    // 保存
    localStorage.setItem("records", JSON.stringify(records));

    // 渲染
    renderTable();

  } catch (err) {
    console.error(err);
    alert("请求失败");
  }
});

function renderTable() {
  tableBody.innerHTML = "";

  records.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.subject || ""}</td>
      <td>${r.term || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.lesson || ""}</td>
      <td>${r.content || ""}</td>
      <td>${r.score || ""}%</td>
    `;

    tableBody.appendChild(tr);
  });
}

// 转 base64
function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}

// 生成报告
function generateReport() {
  if (records.length === 0) {
    reportBox.innerHTML = "暂无数据";
    return;
  }

  let scores = records.map(r => parseFloat(r.score)).filter(s => !isNaN(s));

  let avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  let trend = "稳定";
  if (scores.length >= 2) {
    let last = scores[scores.length - 1];
    let prev = scores[scores.length - 2];

    if (last > prev) trend = "上升 📈";
    else if (last < prev) trend = "下降 📉";
  }

  // 薄弱点（低于70）
  let weak = records
    .filter(r => parseFloat(r.score) < 70)
    .map(r => r.content);

  reportBox.innerHTML = `
    <p>📊 平均成绩：${avg}%</p>
    <p>📈 趋势：${trend}</p>
    <p>⚠️ 薄弱点：</p>
    <ul>
      ${weak.map(w => `<li>${w}</li>`).join("") || "无明显薄弱点"}
    </ul>
  `;
}

// 按钮绑定
document.getElementById("genReport").onclick = generateReport;
