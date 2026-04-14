export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.NOVITA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "NOVITA_API_KEY missing in Vercel environment variables"
      });
    }

    const { image, prompt = "", intensity = 0.75 } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "Image is required" });
    }

    // intensity: 0.3 → 3.5 (محافظ) | 1.0 → 7.0 (جريء)
    const guidanceScale = 3.5 + (Number(intensity) - 0.3) * (3.5 / 0.7);

    const createResponse = await fetch("https://api.novita.ai/v3/async/flux-1-kontext-pro", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        images: [image],
        guidance_scale: guidanceScale,
        aspect_ratio: "1:1",
        seed: -1
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      return res.status(500).json({
        error: "Failed to create task",
        details: createData
      });
    }

    if (!createData.task_id) {
      return res.status(500).json({
        error: "No task_id returned from Novita",
        details: createData
      });
    }

    let result = null;
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pollResponse = await fetch(
        `https://api.novita.ai/v3/async/task-result?task_id=${encodeURIComponent(createData.task_id)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      const pollData = await pollResponse.json();

      if (!pollResponse.ok) {
        return res.status(500).json({
          error: "Failed to get task result",
          details: pollData
        });
      }

      const status = pollData?.task?.status;

      if (status === "TASK_STATUS_SUCCEED") {
        result = pollData;
        break;
      }

      if (status === "TASK_STATUS_FAILED") {
        return res.status(500).json({
          error: pollData?.task?.reason || "Task failed",
          details: pollData
        });
      }
    }

    if (!result) {
      return res.status(500).json({
        error: "Task timed out"
      });
    }

    const output = result?.images?.[0]?.image_url;

    if (!output) {
      return res.status(500).json({
        error: "No image returned from Novita",
        details: result
      });
    }

    return res.status(200).json({ output });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown server error"
    });
  }
}
