export class OpenAIProviderUnavailableError extends Error {}
export class OpenAIGenerationError extends Error {}

export type OpenAIProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export function getOpenAIConfig(featureLabel: string): OpenAIProviderConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIProviderUnavailableError(`OPENAI_API_KEY is not configured for ${featureLabel}.`);
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
  };
}

export function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  if (Array.isArray(record.output)) {
    const parts: string[] = [];
    for (const item of record.output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const text = (part as Record<string, unknown>).text;
        if (typeof text === "string" && text.trim()) {
          parts.push(text.trim());
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  return null;
}

export function parseProviderJsonOutput(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw error;
  }
}

export async function requestOpenAIJson(args: {
  config: OpenAIProviderConfig;
  system: string;
  user: string;
  featureLabel: string;
}): Promise<unknown> {
  const response = await fetch(`${args.config.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.config.apiKey}`,
    },
    body: JSON.stringify({
      model: args.config.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: args.system }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: args.user }],
        },
      ],
    }),
  });

  if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
    throw new OpenAIProviderUnavailableError(
      `${args.featureLabel} provider request failed with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new OpenAIGenerationError(`${args.featureLabel} provider request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const text = extractOutputText(payload);
  if (!text) {
    throw new OpenAIGenerationError(`The ${args.featureLabel} provider returned no usable text output.`);
  }

  try {
    return parseProviderJsonOutput(text);
  } catch {
    throw new OpenAIGenerationError(`The ${args.featureLabel} provider returned non-JSON output.`);
  }
}
