import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { timeAgo } from "@/lib/utils";
import { ReportActions, UserBanButton } from "./AdminActions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
        <p className="text-muted-foreground mt-2">You must be signed in.</p>
      </div>
    );
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
      </div>
    );
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
        <p className="text-muted-foreground mt-2">
          You do not have admin privileges.
        </p>
      </div>
    );
  }

  // Fetch reports
  const reports = await prisma.report.findMany({
    where: { status: "pending" },
    include: {
      reporter: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hydrate target data
  const hydratedReports = await Promise.all(
    reports.map(async (report) => {
      let target: {
        id: string;
        title?: string | null;
        body?: string | null;
        postId?: string;
        authorName?: string | null;
      } | null = null;

      if (report.targetType === "post") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            body: true,
            author: { select: { name: true } },
          },
        });
        if (post)
          target = {
            id: post.id,
            title: post.title,
            body: post.body,
            authorName: post.author.name,
          };
      } else if (report.targetType === "comment") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            body: true,
            postId: true,
            author: { select: { name: true } },
          },
        });
        if (comment)
          target = {
            id: comment.id,
            body: comment.body,
            postId: comment.postId,
            authorName: comment.author.name,
          };
      }

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reporterName: report.reporter.name,
        target,
      };
    })
  );

  // Fetch recent users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      type: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">
        Admin Dashboard
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage reports, users, and content moderation.
      </p>

      {/* Reports Section */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Pending Reports ({hydratedReports.length})
        </h2>
        {hydratedReports.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No pending reports.
          </div>
        ) : (
          <div className="space-y-3">
            {hydratedReports.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-md border-transparent bg-primary/20 text-primary px-2 py-0.5 text-xs font-semibold">
                        {report.targetType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Reported by {report.reporterName || "Unknown"}{" "}
                        &middot; {timeAgo(report.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">Reason: </span>
                      {report.reason}
                    </p>
                    {report.target && (
                      <div className="mt-2 rounded border border-border bg-background p-3 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          By {report.target.authorName || "Unknown"}
                        </p>
                        {report.target.title && (
                          <p className="font-medium text-foreground">
                            {report.target.title}
                          </p>
                        )}
                        {report.target.body && (
                          <p className="text-muted-foreground line-clamp-3">
                            {report.target.body}
                          </p>
                        )}
                      </div>
                    )}
                    {!report.target && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        Content has been deleted.
                      </p>
                    )}
                  </div>
                </div>
                <ReportActions
                  reportId={report.id}
                  targetType={report.targetType}
                  targetId={report.targetId}
                  postId={
                    report.targetType === "comment"
                      ? report.target?.postId
                      : report.targetId
                  }
                  contentExists={!!report.target}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Users ({users.length})
        </h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-background/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Posts
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Comments
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-background/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            {(user.name || "?")[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {user.name || "Unnamed"}
                            {user.isAdmin && (
                              <span className="ml-1.5 text-xs text-primary">
                                (admin)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md border-transparent bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-semibold">
                        {user.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user._count.posts}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user._count.comments}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {timeAgo(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserBanButton
                        userId={user.id}
                        isAdmin={user.isAdmin}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
