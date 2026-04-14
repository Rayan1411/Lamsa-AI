export default async function handler(req, res) {
  const apiKey = process.env.REPLICATE_API_KEY;

  const { image, prompt } = req.body;

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      version: "76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
      input: {
        image: image,
        prompt: `modern interior design, ${prompt}, same room layout`
      }
    })
  });

  let data = await response.json();

  while (data.status !== "succeeded" && data.status !== "failed") {
    await new Promise(r => setTimeout(r, 2000));

    const check = await fetch(data.urls.get, {
      headers: {
        "Authorization": `Token ${apiKey}`
      }
    });

    data = await check.json();
  }

  if (data.status === "succeeded") {
    res.json({ output: data.output[0] });
  } else {
    res.json({ error: data });
  }
}
