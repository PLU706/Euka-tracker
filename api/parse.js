module.exports = async function (req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("KEY:", apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: "No API key" });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // 去掉 base64 头
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
              parts: [
                {
                  text: `
请从这张学习截图中提取以下信息，并返回JSON：

{
  "subject": "",
  "term": "",
  "course": "",
  "lesson": "",
  "content": "",
  "score": ""
}

规则：
- subject: 科目（如 English）
- term: 如 Term 1 / Week 1
- course: 课程标题
- lesson: Lesson 1
- content: 学习内容总结
- score: 如 80%

只返回JSON，不要解释
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

    console.log("Gemini raw:", JSON.stringify(data));

    // ❗ 解析 Gemini 返回
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({ error: "No text returned", raw: data });
    }

    // 提取 JSON（防止模型多说话）
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "JSON parse failed",
        text: text,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
