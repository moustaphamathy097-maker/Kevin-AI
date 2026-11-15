import "dotenv/config";
import express, { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import type { Attachment, FocusPreset, GroundingSource, ReasoningMode } from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = "gemini-4-hydrogen";

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function buildSystemInstruction(preset: FocusPreset, customInstructions: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const base = [
    "You are Kevin, a sharp, calm, and deeply capable AI assistant.",
    `Today's date is ${today}.`,
    "Communicate clearly and directly in clean Markdown.",
    "Avoid filler pleasantries, excessive exclamation marks, or unnecessary hedging.",
    "When writing code, provide complete, accurate, idiomatic implementations with explicit language tags on fenced code blocks.",
    "When answering complex questions, structure your response with crisp headings or concise lists only where it improves clarity.",
  ];

  const presetInstructions: Record<FocusPreset, string> = {
    general:
      "Adapt naturally to the user's request—whether brainstorming, explaining concepts, drafting prose, or solving technical problems.",
    engineering:
      "Focus on software architecture, systems engineering, performance, security, and production-ready code. Prefer concrete examples and edge-case awareness over high-level generalizations.",
    editorial:
      "Focus on clarity, rhythm, precision, and persuasive structure in writing. Offer sharp edits, clear rationales, and polished prose.",
    research:
      "Prioritize analytical rigor, structured comparisons, explicit assumptions, and balanced synthesis. Clearly distinguish verified facts from reasoned inferences.",
  };

  const parts = [...base, presetInstructions[preset] ?? presetInstructions.general];

  if (customInstructions && customInstructions.trim().length > 0) {
    parts.push(`User preferences and instructions:\n${customInstructions.trim()}`);
  }

  return parts.join("\n\n");
}

function mapThinkingLevel(mode: ReasoningMode): ThinkingLevel {
  switch (mode) {
    case "fast":
      return ThinkingLevel.LOW;
    case "deep":
      return ThinkingLevel.XHIGH;
    case "balanced":
    default:
      return ThinkingLevel.HIGH;
  }
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

function buildContents(messages: IncomingMessage[]): Content[] {
  return messages.map((msg) => {
    const parts: Part[] = [];

    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        if (att.kind === "text") {
          parts.push({
            text: `Attached file (${att.name}):\n\`\`\`\n${att.data}\n\`\`\``,
          });
        } else {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data,
            },
          });
        }
      }
    }

    if (msg.content && msg.content.trim().length > 0) {
      parts.push({ text: msg.content });
    } else if (parts.length === 0) {
      parts.push({ text: "Please review the attached content." });
    }

    return {
      role: msg.role === "assistant" ? "model" : "user",
      parts,
    };
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY is not configured")) {
    return { status: 500, message: raw };
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("PERMISSION_DENIED") || raw.includes("403")) {
    return {
      status: 403,
      message: "API key is invalid or lacks permission. Please verify your key in Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message: "Rate limit or quota reached. Please wait a moment before sending another message.",
    };
  }
  if (raw.includes("NOT_FOUND") || raw.includes("404")) {
    return {
      status: 404,
      message: `Requested model (${MODEL_NAME}) was not found or is currently unavailable.`,
    };
  }
  return {
    status: 500,
    message: raw || "An unexpected error occurred while generating a response.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, model: MODEL_NAME });
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const {
      messages,
      mode = "balanced",
      webSearch = false,
      preset = "general",
      customInstructions = "",
    } = req.body as {
      messages?: IncomingMessage[];
      mode?: ReasoningMode;
      webSearch?: boolean;
      preset?: FocusPreset;
      customInstructions?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Messages array is required." });
      return;
    }

    // Configure SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendEvent = (event: string, payload: unknown) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    try {
      const ai = getAIClient();
      const contents = buildContents(messages);
      const systemInstruction = buildSystemInstruction(preset, customInstructions);
      const thinkingLevel = mapThinkingLevel(mode);

      const stream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
          ...(webSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const seenSources = new Map<string, GroundingSource>();

      for await (const chunk of stream) {
        if (abortController.signal.aborted) {
          break;
        }

        if (chunk.text) {
          sendEvent("chunk", { text: chunk.text });
        }

        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          for (const g of groundingChunks) {
            if (g.web?.uri) {
              seenSources.set(g.web.uri, {
                uri: g.web.uri,
                title: g.web.title || g.web.uri,
              });
            }
          }
        }
      }

      if (seenSources.size > 0) {
        sendEvent("sources", { sources: Array.from(seenSources.values()) });
      }

      sendEvent("done", { ok: true });
      res.end();
    } catch (err) {
      if (!abortController.signal.aborted) {
        const formatted = formatApiError(err);
        sendEvent("error", { message: formatted.message, status: formatted.status });
      }
      res.end();
    }
  });

  app.post("/api/title", async (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Generate a concise 3 to 5 word title for a conversation that starts with this user message. Return only the plain title text with no quotes, punctuation at the end, or prefixes:\n\n${prompt.slice(0, 600)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const title = (response.text ?? "New conversation")
        .replace(/^["'`#*\s]+|["'`.\s]+$/g, "")
        .slice(0, 60);

      res.json({ title: title || "New conversation" });
    } catch {
      res.json({ title: prompt.slice(0, 40).trim() || "New conversation" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kevin AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
