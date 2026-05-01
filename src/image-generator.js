const OPENAI_API_URL = "https://api.openai.com/v1/images/generations";
const CANDIDATE_COUNT = 5;

export { CANDIDATE_COUNT };

export class ImageGenerator {
  #apiKey;
  #model;

  constructor({ apiKey, model = "dall-e-3" }) {
    if (!apiKey) throw new Error("OpenAI API key is required");
    this.#apiKey = apiKey;
    this.#model = model;
  }

  static fromEnv() {
    return new ImageGenerator({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
    });
  }

  async generateCandidates(prompt, { count = CANDIDATE_COUNT, size = "1024x1024" } = {}) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("prompt must be a non-empty string");
    }
    if (count < 1 || count > 10) {
      throw new Error("count must be between 1 and 10");
    }

    const images = [];
    for (let i = 0; i < count; i++) {
      const image = await this.#generate(prompt, size, i);
      images.push(image);
    }

    return images;
  }

  async #generate(prompt, size, index) {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#apiKey}`,
      },
      body: JSON.stringify({
        model: this.#model,
        prompt,
        n: 1,
        size,
        response_format: "url",
      }),
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(`OpenAI image generation failed: ${data.error.message}`);
    }

    const result = data.data[0];
    return {
      index,
      url: result.url,
      revisedPrompt: result.revised_prompt || prompt,
    };
  }
}
