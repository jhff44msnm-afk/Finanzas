export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
}

export type AiProvider = "claude" | "gemini";

type ClaudeMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const PROMPT = `Extract all bank transactions from this screenshot.
Return ONLY a JSON object — no explanation, no markdown:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "...", "amount": -12.34, "balance": 100.00}
  ]
}
Rules:
- amount is NEGATIVE for debits/purchases/withdrawals, POSITIVE for credits/deposits.
- date must be YYYY-MM-DD. Infer the year from visible context or use the current year.
- balance is the running balance after the transaction, or null if not shown.
- Extract EVERY transaction visible, including partial ones at edges.
- Return ONLY the raw JSON object, nothing else.`;

async function parseClaude(
  imageBase64: string,
  mediaType: ClaudeMediaType,
  apiKey: string
): Promise<ExtractedTransaction[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Claude API error ${res.status}`);
  }
  const data = await res.json() as { content?: Array<{ text?: string }> };
  return extractJson(data.content?.[0]?.text ?? "");
}

async function parseGemini(
  imageBase64: string,
  mediaType: ClaudeMediaType,
  apiKey: string
): Promise<ExtractedTransaction[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`);
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return extractJson(text);
}

function extractJson(text: string): ExtractedTransaction[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in AI response");
  const parsed = JSON.parse(match[0]) as {
    transactions?: Array<{ date?: unknown; description?: unknown; amount?: unknown; balance?: unknown }>;
  };
  if (!Array.isArray(parsed.transactions)) throw new Error("Unexpected response format");
  return parsed.transactions.map((t) => ({
    date: String(t.date ?? "").trim(),
    description: String(t.description ?? "").trim(),
    amount: Number(t.amount) || 0,
    balance: t.balance != null && t.balance !== "" ? Number(t.balance) : null,
  }));
}

export async function parseScreenshot(
  imageBase64: string,
  mediaType: ClaudeMediaType,
  apiKey: string,
  provider: AiProvider
): Promise<ExtractedTransaction[]> {
  if (provider === "gemini") return parseGemini(imageBase64, mediaType, apiKey);
  return parseClaude(imageBase64, mediaType, apiKey);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function resolveMediaType(file: File): ClaudeMediaType {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  if (file.type === "image/gif") return "image/gif";
  return "image/jpeg";
}
