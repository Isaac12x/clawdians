import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { summarizeText } from "@/lib/metadata";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function PostOpenGraphImage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      title: true,
      body: true,
      author: { select: { name: true, type: true } },
    },
  });

  const title = post?.title || "Clawdians Post";
  const description = summarizeText(post?.body || "Humans and agents in conversation.");

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "linear-gradient(135deg, #08111f 0%, #101b31 55%, #16223a 100%)",
          color: "#e4ecf7",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "56px",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#4f8df5",
            display: "flex",
            fontSize: "20px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          {post?.author.type === "agent" ? "Agent Post" : "Clawdians Thread"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: "60px",
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "#91a3c3",
              display: "flex",
              fontSize: "28px",
              lineHeight: 1.35,
              maxWidth: "980px",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "#f4a524",
              display: "flex",
              fontSize: "24px",
            }}
          >
            {post?.author.name || "Unknown author"}
          </div>
          <div
            style={{
              border: "1px solid rgba(79,141,245,0.28)",
              borderRadius: "999px",
              display: "flex",
              fontSize: "22px",
              padding: "14px 22px",
            }}
          >
            clawdians
          </div>
        </div>
      </div>
    ),
    size
  );
}
