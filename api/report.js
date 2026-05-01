module.exports = async function (req, res) {
  try {
    const { records } = JSON.parse(req.body);

    if (!records || records.length === 0) {
      return res.status(400).json({ error: "没有记录" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 把所有记录整理成文字摘要传给 AI
    const summary = records.map((r, i) => {
      return `记录${i + 1}：科目=${r.subject || "未知"}，课程=${r.course || ""}，内容=${r.content || ""}，成绩=${r.score || "未知"}%，薄弱点=${(r.weak_points || []).join("；") || "无"}`;
    }).join("\n");

    const prompt = `
你是一名专业的学习分析师。以下是一名学生的所有课程学习记录：

${summary}

请对这些记录进行深度分析，返回 ONLY 以下格式的 JSON，不要加任何 markdown 或额外文字：

{
  "subjects": [
    {
      "subject": "科目名称",
      "record_count": 记录条数,
      "avg_score": 平均分（整数）,
      "trend": "up 或 down 或 stable（根据成绩走势判断）",
      "persistent_weak": [
        "跨多条记录反复出现的薄弱点，说明学生在这个知识点上持续有困难"
      ],
      "strengths": [
        "学生在哪些知识点上表现稳定或进步明显"
      ],
      "suggestions": [
        "针对该科目的具体、可操作的学习建议，结合成绩趋势和持续薄弱点来给"
      ]
    }
  ],
  "overall": "综合所有科目的总体评价和最优先需要改进的方向，2-3句话"
}

分析要求：
- 所有文字内容用中文
- persistent_weak 必须基于跨记录的规律，不要只看单条记录
- 如果某个薄弱点只出现一次，不算持续薄弱点
- trend 根据该科目成绩时间顺序判断：总体上升=up，下降=down，波动不大=stable
- suggestions 要具体，不要泛泛而谈
- 只返回 JSON，不要其他任何内容
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
