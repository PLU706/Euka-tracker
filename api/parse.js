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
Extract table data from this image.

Return JSON only:

{
  "rows": [
    {
      "subject": "",
      "term": "",
      "course": "",
      "lesson": "",
      "content": "",
      "score": ""
    }
  ]
}
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

    const json = JSON.parse(text);

    res.status(200).json(json);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "解析失败" });
  }
};
