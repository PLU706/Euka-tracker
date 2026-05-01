module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("KEY:", apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: "No API key found" });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // 去掉 base64 头
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // 🔥 调用 Gemini（已用正确模型 + 正确格式）
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
- subject: 科目（English）
- term: Term 1 / Week 1
- course: 课程标题
- lesson: Lesson 1
- content: 内容总结
- score: 80%

⚠️ 只返回JSON，不要任何解释
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

    // 🔍 打印完整返回（关键调试）
    console.log("Gemini FULL RESPONSE:", JSON.stringify(data, null, 2));

    // ❗ 如果 Gemini 报错，直接返回
    if (data.error) {
      return res.status(500).json({
        error: "Gemini API Error",
        details: data.error,
      });
    }

    // ✅ 尝试获取文本（兼容多种结构）
    let text = "";

    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content.parts;

      for (let p of parts) {
        if (p.text) {
          text += p.text;
        }
      }
    }

    if (!text) {
      return res.status(500).json({
        error: "No text returned",
        raw: data,
      });
    }

    console.log("AI TEXT:", text);

    // 🧠 提取 JSON（防模型多说话）
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        error: "JSON parse failed",
        text: text,
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({
        error: "JSON format invalid",
        text: text,
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "Server crash",
      message: err.message,
    });
  }
};
