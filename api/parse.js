module.exports = async function (req, res) {
  try {
    const { image } = JSON.parse(req.body);

    const apiKey = process.env.GEMINI_API_KEY;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `
You are a student learning record assistant. Extract information from this screenshot of a learning platform.

Return ONLY valid JSON, no markdown, no extra text:

{
  "rows": [
    {
      "subject": "subject name, e.g. English / Math / Science",
      "term": "term and week, e.g. Term 1 Week 1",
      "course": "course or unit title",
      "lesson": "lesson number or name",
      "content": "brief description of what this lesson covers (1-2 sentences)",
      "score": "score as percentage number only, e.g. 80, or empty string if not shown",
      "weak_points": ["specific topic the student struggled with based on wrong answers or low score, in Chinese", "..."],
      "suggestions": ["specific study suggestion based on the content and score, in Chinese", "..."]
    }
  ]
}

Rules:
- weak_points and suggestions must be in Chinese
- weak_points: identify specific knowledge gaps based on the questions answered incorrectly or the topic of the lesson. Be specific to the subject (e.g. for Math: "分数加减法", for English: "排他性语言的识别")
- suggestions: give actionable advice tailored to the subject and content
- If score >= 85, weak_points can be empty array
- If no score is visible, leave score as empty string
- Return only JSON, nothing else
                `
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: image
                }
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(clean);

    res.status(200).json(json);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "解析失败" });
  }
};
