module.exports = async function handler(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
请从以下OCR文本中提取学习记录，并返回JSON：

字段：
- subject
- term_week
- lesson_title
- lesson_number
- content
- score

⚠️要求：
只返回JSON，不要解释

OCR内容：
${text}
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log("Gemini返回：", data);

    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 提取JSON
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
      return res.status(500).json({ error: "解析失败", raw: content });
    }

    res.status(200).json(json);

  } catch (error) {
    console.error("Gemini API错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
};
console.log("KEY:", process.env.GEMINI_API_KEY);
// force new deploy
