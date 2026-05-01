module.exports = async function handler(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
请从以下OCR文本中提取学习记录，并返回JSON：

字段：
- subject（科目）
- term_week（学期/周次）
- lesson_title（课程标题）
- lesson_number（Lesson编号）
- content（学习内容）
- score（成绩，比如80%）

⚠️要求：
只返回JSON，不要解释，不要多余文字

OCR内容：
${text}
`
          }
        ]
      })
    });

    const data = await response.json();

    // 👉 提取AI返回内容
    const content = data.choices?.[0]?.message?.content || "";

    // 👉 尝试提取JSON
    let json = null;
    try {
      json = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        json = JSON.parse(match[0]);
      }
    }

    if (!json) {
      return res.status(500).json({ error: "AI解析失败", raw: content });
    }

    res.status(200).json(json);

  } catch (error) {
    console.error("API错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
};
