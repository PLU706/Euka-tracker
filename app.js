let records = [];

document.getElementById("upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("status").innerText = "识别中...";

  const result = await Tesseract.recognize(file, "eng");
  const text = result.data.text;

  document.getElementById("status").innerText = "识别完成";

  const data = parseText(text);
  addRecord(data);
});

function parseText(text) {
  let scoreMatch = text.match(/(\\d+)%/);
  let correctMatch = text.match(/(\\d+) out of (\\d+)/);

  let subject = text.includes("ENGLISH") ? "English" : "Unknown";

  let lessonMatch = text.match(/LESSON\\s+\\d+\\s+(.*)/);

  let weaknesses = [];

  if (text.includes("QUESTION 2") && text.includes("incorrect")) {
    weaknesses.push("language pattern");
  }

  return {
    subject,
    lesson: lessonMatch ? lessonMatch[1] : "Unknown lesson",
    score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
    correct: correctMatch ? parseInt(correctMatch[1]) : 0,
    total: correctMatch ? parseInt(correctMatch[2]) : 0,
    weaknesses
  };
}

function addRecord(data) {
  records.push(data);
  renderTable();
}

function renderTable() {
  const table = document.getElementById("table");

  table.innerHTML = records.map(r => `
    <tr>
      <td>${r.subject}</td>
      <td>${r.lesson}</td>
      <td>${r.score}%</td>
      <td>${r.weaknesses.join(", ")}</td>
    </tr>
  `).join("");
}

// ===== 分析函数 =====

function calculateTrend(scores) {
  if (scores.length < 2) return "数据不足";

  let diff = scores[scores.length - 1] - scores[0];

  if (diff > 5) return "上升";
  if (diff < -5) return "下降";
  return "稳定";
}

function calculateStability(scores) {
  let avg = scores.reduce((a,b)=>a+b,0)/scores.length;

  let variance = scores.reduce((a,b)=>a + Math.pow(b-avg,2),0)/scores.length;

  if (variance < 20) return "稳定";
  if (variance < 100) return "中等波动";
  return "波动较大";
}

function analyzeWeakness(records) {
  let count = {};

  records.forEach(r => {
    r.weaknesses.forEach(w => {
      count[w] = (count[w] || 0) + 1;
    });
  });

  return Object.entries(count)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);
}

function generateReport() {
  if (records.length === 0) return;

  let scores = records.map(r => r.score);

  let avg = scores.reduce((a,b)=>a+b,0)/scores.length;
  let trend = calculateTrend(scores);
  let stability = calculateStability(scores);
  let weak = analyzeWeakness(records);

  let report = `
📊 学习评估报告

平均分：${avg.toFixed(1)}%
趋势：${trend}
稳定性：${stability}

薄弱环节：
${weak.map(w => `- ${w[0]}（${w[1]}次）`).join("\\n")}

建议：
建议针对高频错误进行专项训练，并加强错题复盘。
  `;

  document.getElementById("report").innerText = report;
}