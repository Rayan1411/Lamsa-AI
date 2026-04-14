export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.REPLICATE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "REPLICATE_API_KEY is missing in Vercel environment variables"
      });
    }

    const { image, prompt = "", style = "modern", roomType = "living" } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "Image is required" });
    }

    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
        input: {
          image,
          prompt: `${style} ${roomType} interior design, ${prompt}, same room layout, realistic, high quality`
        }
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      return res.status(500).json({
        error: "Failed to create Replicate prediction",
        details: createData
      });
    }

    let result = createData;
    let attempts = 0;
    const maxAttempts = 30;

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const pollResponse = await fetch(result.urls.get, {
        headers: {
          "Authorization": `Token ${apiKey}`
        }
      });

      result = await pollResponse.json();
    }

    if (result.status === "succeeded") {
      const output = Array.isArray(result.output) ? result.output[0] : result.output;
      return res.status(200).json({ output });
    }

    return res.status(500).json({
      error: "Generation failed or timed out",
      details: result
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown server error"
    });
  }
}
