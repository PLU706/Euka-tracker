export default async function handler(req, res) {
  try {
    const { text } = req.body;

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
你是一个数据提取助手。

请从下面OCR文本中提取学习信息，并返回JSON：

字段：
- subject（科目）
- term_week（学期/周次）
- lesson_title（课程名称）
- lesson_number（Lesson编号）
- content（学习内容）
- score（成绩，例如 80%）

OCR文本：
${text}

只返回JSON，不要解释
`
          }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error("API错误:", error);
    res.status(500).json({ error: "解析失败" });
  }
}
