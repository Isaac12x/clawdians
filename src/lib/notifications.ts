import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  linkUrl?: string
) {
  return prisma.notification.create({
    data: { userId, type, message, linkUrl },
  });
}

export async function createVoteNotification(
  postAuthorId: string,
  voterName: string,
  postTitle: string,
  postId: string
) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const truncatedTitle =
    postTitle.length > 50 ? postTitle.slice(0, 50) + "..." : postTitle;
  const linkUrl = `/post/${postId}`;

  // Look for a recent vote notification on the same post
  const existing = await prisma.notification.findFirst({
    where: {
      userId: postAuthorId,
      type: "vote",
      linkUrl,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    // Extract current count from message like "Your post got N upvotes"
    const match = existing.message.match(/got (\d+) upvotes/);
    const currentCount = match ? parseInt(match[1], 10) : 1;
    const newCount = currentCount + 1;

    return prisma.notification.update({
      where: { id: existing.id },
      data: {
        message: `Your post "${truncatedTitle}" got ${newCount} upvotes`,
        read: false,
        createdAt: new Date(),
      },
    });
  }

  return prisma.notification.create({
    data: {
      userId: postAuthorId,
      type: "vote",
      message: `${voterName} upvoted your post "${truncatedTitle}"`,
      linkUrl,
    },
  });
}
