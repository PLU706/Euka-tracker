const input = document.getElementById("fileInput");
const statusText = document.getElementById("status");

input.addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  statusText.innerText = "上传中...";

  const reader = new FileReader();

  reader.onload = async function () {
    const base64 = reader.result;

    console.log("base64:", base64.slice(0, 50));

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64
        })
      });

      const data = await res.json();

      console.log("返回数据:", data);

      if (!res.ok) {
        statusText.innerText = "解析失败 ❌";
        alert(JSON.stringify(data));
        return;
      }

      statusText.innerText = "识别成功 ✅";

      // 填充表格
      document.getElementById("subject").innerText = data.subject || "";
      document.getElementById("term").innerText = data.term || "";
      document.getElementById("course").innerText = data.course || "";
      document.getElementById("lesson").innerText = data.lesson || "";
      document.getElementById("content").innerText = data.content || "";
      document.getElementById("score").innerText = data.score || "";

      // 保存历史（用于报告）
      localStorage.setItem("lastRecord", JSON.stringify(data));

    } catch (err) {
      console.error(err);
      statusText.innerText = "请求失败 ❌";
    }
  };

  reader.readAsDataURL(file);
});

function generateReport() {
  const data = JSON.parse(localStorage.getItem("lastRecord"));

  if (!data) {
    alert("没有数据");
    return;
  }

  let score = parseInt(data.score);

  let level = "";
  let suggestion = "";

  if (score >= 80) {
    level = "表现良好";
    suggestion = "继续保持，适当增加难度训练。";
  } else if (score >= 60) {
    level = "中等水平";
    suggestion = "加强薄弱知识点练习。";
  } else {
    level = "需要提升";
    suggestion = "建议复习基础内容，多做练习。";
  }

  document.getElementById("report").innerHTML = `
    <p><strong>科目：</strong>${data.subject}</p>
    <p><strong>成绩：</strong>${data.score}</p>
    <p><strong>评估：</strong>${level}</p>
    <p><strong>建议：</strong>${suggestion}</p>
  `;
}
