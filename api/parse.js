module.exports = async function (req, res) {
  try {
    const { image, mimeType } = JSON.parse(req.body);

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
You are a student learning record assistant. Carefully analyze this screenshot of a learning platform.

The screenshot shows quiz/exercise results. Each question may have a green tick (correct) or red cross (incorrect) indicator.

Your job:
1. Read the overall score shown (e.g. "3 out of 5 correct" = 60%)
2. Look at EACH question - identify which ones the student got WRONG (red X or marked incorrect)
3. For each wrong question, read what the question was testing and identify the specific knowledge gap
4. Generate targeted weak_points and suggestions based on the ACTUAL wrong answers

Return ONLY valid JSON, no markdown, no extra text:

{
  "rows": [
    {
      "subject": "subject name, e.g. English / Math / Science",
      "term": "term and week shown at top of page, e.g. Term 1 Week 1",
      "course": "course or unit title shown at top",
      "lesson": "lesson number or name",
      "content": "brief description of what this lesson covers (1-2 sentences in Chinese)",
      "score": "score as percentage number only, e.g. 60",
      "weak_points": [
        "具体描述学生在哪道题上出错，以及对应的知识薄弱点，例如：第1题答错——无法准确识别形态讽刺（morphemic irony）的词语"
      ],
      "suggestions": [
        "针对该薄弱点的具体学习建议，例如：复习Holes中地名与人名的形态构词含义，重点理解反讽手法"
      ]
    }
  ]
}

Rules:
- weak_points and suggestions MUST be in Chinese
- weak_points must reference specific questions that were wrong and what concept they test
- If all questions correct, weak_points = []
- score must be a number (e.g. 60), not a string like "60%"
- subject must use consistent names: "English", "Math", "Science", "History", "Geography", "Art", "Music" — pick the closest match, never abbreviate or vary
- Return only JSON, nothing else
                `
              },
              {
                inlineData: {
                  mimeType: mimeType || "image/png",
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
