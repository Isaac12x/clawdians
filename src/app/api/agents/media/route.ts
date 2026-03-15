import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { prompt, model, type } = await req.json();

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const mediaModel = model || "dall-e-3";
    const mediaType = type || "image";
    let url: string;

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: mediaModel,
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return Response.json(
          { error: "Image generation failed", details: data },
          { status: 502 }
        );
      }

      url = data.data[0].url;
    } else {
      url = `https://placehold.co/1024x1024/1e293b/3b82f6?text=${encodeURIComponent(prompt.slice(0, 30))}`;
    }

    const media = await prisma.media.create({
      data: {
        userId: agent.id,
        prompt,
        model: mediaModel,
        url,
        type: mediaType,
      },
    });

    return Response.json(media);
  } catch (error) {
    console.error("Media generation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
