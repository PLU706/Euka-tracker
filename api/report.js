module.exports = async function (req, res) {
  try {
    const { level, label, records, translateText } = JSON.parse(req.body);
    const apiKey = process.env.GEMINI_API_KEY;

    // 翻译模式
    if (level === "translate") {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Translate the following Chinese learning report into natural English. Keep the structure and meaning exactly the same. Return only the translated text, no extra commentary.\n\n${translateText}` }] }]
          })
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.status(200).json({ translated: text });
    }

    // 根据层级生成不同的摘要文字
    const summary = records.map(r => {
      if (level === "week") {
        return `科目=${r.subject}，${r.lesson||""}，课程=${r.course||""}，成绩=${r.score!=null?r.score+"%":"未知"}，薄弱点=${(r.weak_points||[]).join("；")||"无"}`;
      } else if (level === "term") {
        return `科目=${r.subject}，${r.week}，平均分=${r.avg_score!=null?r.avg_score+"%":"未知"}，薄弱点=${(r.weak_points||[]).join("；")||"无"}`;
      } else {
        return `科目=${r.subject}，${r.term}，平均分=${r.avg_score!=null?r.avg_score+"%":"未知"}，薄弱点=${(r.weak_points||[]).join("；")||"无"}`;
      }
    }).join("\n");

    const levelDesc = {
      week: "这是某一周的课程记录，请分析该周每节课的具体表现，找出本周薄弱知识点和建议。",
      term: "这是某个学期（Term）按周聚合的数据，请分析该学期的学习趋势，找出持续薄弱点和进步点。",
      year: "这是全年按学期聚合的数据，请进行全局分析，找出全年最需要关注的科目和知识点，以及整体学习趋势。"
    }[level];

    const prompt = `
你是一名专业的学习分析师。${levelDesc}

报告范围：${label}
数据如下：
${summary}

请返回 ONLY 以下格式的 JSON，不要加任何 markdown 或额外文字：

{
  "subjects": [
    {
      "subject": "科目名称",
      "avg_score": 平均分（整数）,
      "trend": "up 或 down 或 stable",
      "persistent_weak": ["跨多条记录反复出现的薄弱点，用中文描述"],
      "strengths": ["掌握较好或有进步的知识点，用中文描述"],
      "suggestions": ["具体可操作的学习建议，用中文，结合实际薄弱点"]
    }
  ],
  "overall": "综合所有科目的总评和最优先改进方向，2-3句话，中文"
}

要求：
- 所有内容用中文
- persistent_weak 必须基于数据中反复出现的问题，不要凭空捏造
- suggestions 要具体，不要泛泛而谈
- 如果某科目只有一条记录，trend 返回 "stable"
- 只返回 JSON
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
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
    res.status(500).json({ error: "报告生成失败：" + e.message });
  }
};
