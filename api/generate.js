export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.NOVITA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "NOVITA_API_KEY missing"
      });
    }

    const { image, prompt } = req.body;

    // 1️⃣ إنشاء المهمة
    const createTask = await fetch("https://api.novita.ai/v3/async/flux-kontext-pro", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt || "modern luxury interior design, realistic, same room layout",
        images: [image],
        guidance_scale: 3.5,
        aspect_ratio: "1:1"
      })
    });

    const taskData = await createTask.json();

    if (!createTask.ok) {
      return res.status(500).json({
        error: "Failed to create task",
        details: taskData
      });
    }

    const taskId = taskData.task_id;

    // 2️⃣ انتظار النتيجة
    let result = null;
    let attempts = 0;

    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      const check = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${taskId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const data = await check.json();

      if (data.status === "succeeded") {
        result = data;
        break;
      }
    }

    if (!result) {
      return res.status(500).json({
        error: "Timeout or failed"
      });
    }

    return res.status(200).json({
      output: result.images?.[0]?.url
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
