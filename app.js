let records = [];

// ===== 上传图片 =====
document.getElementById("upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("status").innerText = "识别中...";

  // OCR
  const result = await Tesseract.recognize(file, "eng");
  const text = result.data.text;

  console.log("OCR文本：", text);

  // AI解析（关键）
  const data = await parseWithAI(text);

  if (data) {
    addRecord(data);
    document.getElementById("status").innerText = "识别完成 ✅";
  } else {
    document.getElementById("status").innerText = "识别失败 ❌";
  }
});

// ===== AI解析（核心）=====
async function parseWithAI(text) {
  const apiKey = "在这里填你的OpenAI_API_KEY";

  const prompt = `
你是一个数据提取助手。

请从下面OCR文本中提取学习信息，并返回JSON：

字段要求：
- subject（科目）
- term_week（学期/周次）
- lesson_title（课程名称）
- lesson_number（Lesson编号）
- content（学习内容）
- score（成绩，例如 80%）

OCR文本：
${text}

只返回JSON，不要解释
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const result = await response.json();

    let content = result.choices[0].message.content;

    console.log("AI返回：", content);

    return JSON.parse(content);
  } catch (e) {
    console.error("AI解析失败", e);
    return null;
  }
}

// ===== 添加记录 =====
function addRecord(data) {
  records.push(data);
  renderTable();
}

// ===== 渲染表格 =====
function renderTable() {
  const table = document.getElementById("table");

  table.innerHTML = records.map(r => `
    <tr>
      <td>${r.subject || ""}</td>
      <td>${r.term_week || ""}</td>
      <td>${r.lesson_title || ""}</td>
      <td>${r.lesson_number || ""}</td>
      <td>${r.content || ""}</td>
      <td>${r.score || ""}</td>
    </tr>
  `).join("");
}

// ===== 报告分析 =====
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

function generateReport() {
  if (records.length === 0) return;

  let scores = records.map(r => parseInt(r.score));

  let avg = scores.reduce((a,b)=>a+b,0)/scores.length;
  let trend = calculateTrend(scores);
  let stability = calculateStability(scores);

  let report = `
📊 学习评估报告

平均分：${avg.toFixed(1)}%
趋势：${trend}
稳定性：${stability}

建议：
建议加强薄弱知识点训练，并保持稳定练习节奏。
  `;

  document.getElementById("report").innerText = report;
}
