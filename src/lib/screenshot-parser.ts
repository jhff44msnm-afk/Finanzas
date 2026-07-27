export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
}

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
- date must be YYYY-MM-DD. Infer the year from visible context (statement header, other dates) or use the current year.
- balance is the running account balance after the transaction, or null if not shown.
- Extract EVERY transaction visible in the image, including partial ones at edges.
- Return ONLY the raw JSON object, nothing else.`;

export async function parseScreenshot(
  imageBase64: string,
  mediaType: ClaudeMediaType,
  apiKey: string
): Promise<ExtractedTransaction[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `API error ${response.status}`);
  }

  const data = await response.json() as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");

  const parsed = JSON.parse(match[0]) as {
    transactions?: Array<{
      date?: unknown;
      description?: unknown;
      amount?: unknown;
      balance?: unknown;
    }>;
  };

  if (!Array.isArray(parsed.transactions)) throw new Error("Unexpected response format");

  return parsed.transactions.map((t) => ({
    date: String(t.date ?? "").trim(),
    description: String(t.description ?? "").trim(),
    amount: Number(t.amount) || 0,
    balance: t.balance != null && t.balance !== "" ? Number(t.balance) : null,
  }));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function resolveMediaType(file: File): ClaudeMediaType {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  if (file.type === "image/gif") return "image/gif";
  return "image/jpeg"; // JPEG, HEIC (iOS auto-converts), and unknown
}
