module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "No API key found" });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
从这张学习截图中提取信息，并返回JSON：

{
  "subject": "",
  "term": "",
  "course": "",
  "lesson": "",
  "content": "",
  "score": ""
}

要求：
- subject: 科目（如 English）
- term: Term 1 / Week 1
- course: 课程标题
- lesson: Lesson 1
- content: 学习内容总结
- score: 如 80%

必须尽量填写所有字段，不允许留空。
⚠️ 只返回JSON，不要解释
                  `,
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({
        error: "Gemini API Error",
        details: data.error,
      });
    }

    let text = "";

    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content.parts;
      for (let p of parts) {
        if (p.text) text += p.text;
      }
    }

    if (!text) {
      return res.status(500).json({
        error: "No text returned",
      });
    }

    // ✅ 清理 markdown ```json
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const match = cleanText.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        error: "JSON parse failed",
        text: cleanText,
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({
        error: "JSON format invalid",
        text: cleanText,
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
};
