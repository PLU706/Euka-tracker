const fileInput = document.getElementById("fileInput");
const tableBody = document.getElementById("tableBody");
const reportBox = document.getElementById("report");

let records = JSON.parse(localStorage.getItem("records") || "[]");

renderTable();

// 简单翻译函数（核心关键词）
function translate(text) {
  if (!text) return "";

  return text
    .replace(/lesson explores/gi, "本课讲解")
    .replace(/this lesson explores/gi, "本课讲解")
    .replace(/the lesson explores/gi, "本课讲解")
    .replace(/students?/gi, "学生")
    .replace(/analysis/gi, "分析")
    .replace(/language/gi, "语言")
    .replace(/patterns?/gi, "模式")
    .replace(/examples?/gi, "示例")
    .replace(/understanding/gi, "理解")
    .replace(/identify/gi, "识别")
    .replace(/classification/gi, "分类");
}

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

    // ✅ 修正成绩
    data.score = parseFloat(data.score);

    // ✅ 内容翻译
    data.content = translate(data.content);

    records.push(data);
    localStorage.setItem("records", JSON.stringify(records));

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
      <td>${r.subject}</td>
      <td>${r.term}</td>
      <td>${r.course}</td>
      <td>${r.lesson}</td>
      <td>${r.content}</td>
      <td>${r.score}%</td>
    `;

    tableBody.appendChild(tr);
  });
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}

// ✅ 报告（中文完整版）
function generateReport() {
  if (records.length === 0) {
    reportBox.innerHTML = "暂无数据";
    return;
  }

  let reportHTML = "";

  const subjects = {};

  records.forEach(r => {
    if (!subjects[r.subject]) subjects[r.subject] = [];
    subjects[r.subject].push(r);
  });

  for (let subject in subjects) {
    let list = subjects[subject];
    let scores = list.map(r => r.score);

    let avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

    let trend = "稳定";
    if (scores.length >= 2) {
      let last = scores[scores.length - 1];
      let prev = scores[scores.length - 2];
      if (last > prev) trend = "上升 📈";
      else if (last < prev) trend = "下降 📉";
    }

    let weak = list
      .filter(r => r.score < 70)
      .map(r => r.content);

    // ✅ 中文建议
    let suggestion = "整体表现良好，继续保持当前学习节奏。";

    if (avg < 70) {
      suggestion = "基础较弱，建议加强核心知识点练习，提升理解能力。";
    } else if (trend === "下降 📉") {
      suggestion = "近期成绩下降，建议复习近期课程内容，查找问题原因。";
    } else if (trend === "上升 📈") {
      suggestion = "学习状态良好，可以适当提升难度，进一步强化能力。";
    }

    reportHTML += `
      <h3>📘 ${subject}</h3>
      <p>📊 平均成绩：${avg}%</p>
      <p>📈 趋势：${trend}</p>

      <p>⚠️ 薄弱点：</p>
      <ul>
        ${weak.length ? weak.map(w => `<li>${w}</li>`).join("") : "<li>暂无明显薄弱点</li>"}
      </ul>

      <p>💡 学习建议：</p>
      <p>${suggestion}</p>

      <hr/>
    `;
  }

  reportBox.innerHTML = reportHTML;
}

document.getElementById("genReport").onclick = generateReport;
