import Groq from "groq-sdk";
import { createMockArchitectReply, type SessionMessage } from "./anonymous-sessions";

const GROQ_MODEL = "groq/compound-mini";

export async function createTemporaryGroqArchitectReply({
  content,
  turn,
  previousMessages,
}: {
  content: string;
  turn: number;
  previousMessages: SessionMessage[];
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return createMockArchitectReply({ content, turn, previousMessages });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are Architect Mode, a concise AI architecture interviewer. For now, ask one useful clarifying question at a time. Do not generate a full PRD yet. Keep responses under 120 words.",
        },
        ...previousMessages.slice(-8).map((message) => ({
          role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: message.content,
        })),
        {
          role: "user",
          content,
        },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || createMockArchitectReply({ content, turn, previousMessages });
  } catch (error) {
    console.error("Groq temporary reply failed", error);
    return createMockArchitectReply({ content, turn, previousMessages });
  }
}
