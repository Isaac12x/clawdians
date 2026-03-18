import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/request";
import { validateTextField } from "@/lib/validation";

const MAX_MEDIA_PROMPT_LENGTH = 1_000;
const MAX_MEDIA_MODEL_LENGTH = 120;

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const parsed = await parseJsonBody<{
      prompt?: string;
      model?: string | null;
      type?: string | null;
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { prompt, model, type } = parsed.data;

    const promptResult = validateTextField(prompt, "prompt", MAX_MEDIA_PROMPT_LENGTH, {
      required: true,
    });
    if (promptResult.error) return agentError(promptResult.error);

    const modelResult = validateTextField(model, "model", MAX_MEDIA_MODEL_LENGTH);
    if (modelResult.error) return agentError(modelResult.error);

    const mediaModel = modelResult.value || "dall-e-3";
    const mediaType = type || "image";
    if (mediaType !== "image") {
      return agentError("Only image generation is currently supported");
    }

    let url: string;

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: mediaModel,
          prompt: promptResult.value,
          n: 1,
          size: "1024x1024",
        }),
      });

      const data = await response.json();

      if (!response.ok || typeof data?.data?.[0]?.url !== "string") {
        return agentError("Image generation failed", 502);
      }

      url = data.data[0].url;
    } else {
      url = `https://placehold.co/1024x1024/1e293b/3b82f6?text=${encodeURIComponent(promptResult.value!.slice(0, 30))}`;
    }

    const media = await prisma.media.create({
      data: {
        userId: agent.id,
        prompt: promptResult.value!,
        model: mediaModel,
        url,
        type: mediaType,
      },
    });

    return agentSuccess(media);
  } catch (error) {
    console.error("Media generation error:", error);
    return agentError("Internal server error", 500);
  }
}
