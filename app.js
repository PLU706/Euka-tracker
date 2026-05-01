let records = [];

// ===== 上传图片 =====
document.getElementById("upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("status").innerText = "识别中...";

  try {
    // OCR
    const result = await Tesseract.recognize(file, "eng");
    const text = result.data.text;

    console.log("OCR文本：", text);

    // 调用你自己的后端（Vercel）
    const data = await parseWithAI(text);

    if (data) {
      addRecord(data);
      document.getElementById("status").innerText = "识别完成 ✅";
    } else {
      document.getElementById("status").innerText = "解析失败 ❌";
    }

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "出错 ❌";
  }
});


// ===== 调用 Vercel API =====
async function parseWithAI(text) {
  try {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error("API错误:", response.status);
      return null;
    }

    const data = await response.json();

    // 从AI返回中提取内容
    let content = data.choices?.[0]?.message?.content;

    console.log("AI原始返回：", content);

    if (!content) return null;

    try {
      // 直接尝试解析
      return JSON.parse(content);
    } catch (e) {
      // 如果失败，再用正则提取
      let match = content.match(/\{[\s\S]*\}/);

      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }

      return null;
    }

    // 提取JSON（防止AI多说话）
    let match = content.match(/\{[\s\S]*\}/);

    return match ? JSON.parse(match[0]) : null;

  } catch (err) {
    console.error("AI解析失败:", err);
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


// ===== 生成报告 =====
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
