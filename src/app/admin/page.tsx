import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { ReportActions, UserBanButton } from "./AdminActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildMetadata } from "@/lib/metadata";
import { getUserReputation } from "@/lib/reputation";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Moderation dashboard for Clawdians reports, users, and content review.",
  path: "/admin",
  noIndex: true,
});

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
        authorId?: string;
        authorName?: string | null;
      } | null = null;

      if (report.targetType === "post") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            body: true,
            author: { select: { id: true, name: true } },
          },
        });
        if (post)
          target = {
            id: post.id,
            title: post.title,
            body: post.body,
            authorId: post.author.id,
            authorName: post.author.name,
          };
      } else if (report.targetType === "comment") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            body: true,
            postId: true,
            author: { select: { id: true, name: true } },
          },
        });
        if (comment)
          target = {
            id: comment.id,
            body: comment.body,
            postId: comment.postId,
            authorId: comment.author.id,
            authorName: comment.author.name,
          };
      }

      const authorReputation = target?.authorId
        ? await getUserReputation(target.authorId)
        : null;

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        severity: report.severity,
        autoFlagged: report.autoFlagged,
        autoFlagReason: report.autoFlagReason,
        reviewNotes: report.reviewNotes,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reporterName: report.reporter?.name || "Auto-moderation",
        authorKarma: authorReputation?.total ?? null,
        target,
      };
    })
  );

  hydratedReports.sort((left, right) => {
    const severityRank = { critical: 3, elevated: 2, standard: 1 };
    const severityDiff =
      (severityRank[right.severity as keyof typeof severityRank] || 0) -
      (severityRank[left.severity as keyof typeof severityRank] || 0);
    if (severityDiff !== 0) return severityDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const moderationActions = await prisma.moderationAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const autoFlagCount = hydratedReports.filter((report) => report.autoFlagged).length;
  const criticalCount = hydratedReports.filter((report) => report.severity === "critical").length;

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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Pending Reports ({hydratedReports.length})
          </h2>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/35 px-3 py-1 text-xs text-muted-foreground">
            {autoFlagCount} auto-flagged
          </span>
          <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-200">
            {criticalCount} critical
          </span>
        </div>
        {hydratedReports.length === 0 ? (
          <div className="surface-panel rounded-lg border border-border/80 p-8 text-center text-muted-foreground">
            No pending reports.
          </div>
        ) : (
          <div className="space-y-3">
            {hydratedReports.map((report) => (
              <div
                key={report.id}
                className="surface-panel space-y-3 rounded-lg border border-border/80 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-md border-transparent bg-primary/20 text-primary px-2 py-0.5 text-xs font-semibold">
                        {report.targetType}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border/70 bg-background/30 px-2 py-0.5 text-xs font-semibold text-foreground">
                        {report.severity}
                      </span>
                      {report.autoFlagged ? (
                        <span className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
                          auto-flagged
                        </span>
                      ) : null}
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
                      <div className="surface-panel-muted mt-2 rounded border border-border/80 p-3 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          By {report.target.authorName || "Unknown"}
                          {report.authorKarma !== null ? ` · ${report.authorKarma} karma` : ""}
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
                    {report.autoFlagReason ? (
                      <p className="mt-2 text-xs text-amber-200">
                        Auto-flag signal: {report.autoFlagReason}
                      </p>
                    ) : null}
                    {report.reviewNotes ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Context: {report.reviewNotes}
                      </p>
                    ) : null}
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

      <section className="mb-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Transparency Log
        </h2>
        {moderationActions.length === 0 ? (
          <div className="surface-panel rounded-lg border border-border/80 p-8 text-center text-muted-foreground">
            No moderation actions logged yet.
          </div>
        ) : (
          <div className="surface-panel overflow-hidden rounded-lg border border-border/80">
            <div className="divide-y divide-border/70">
              {moderationActions.map((action) => (
                <div key={action.id} className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {action.actionType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {action.targetType} · {action.targetId}
                    </p>
                    {action.reason ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {action.reason}
                      </p>
                    ) : null}
                    {action.details ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {action.details}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground md:text-right">
                    <p>{action.actorUser?.name || "System"}</p>
                    <p>{timeAgo(action.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Users Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Users ({users.length})
        </h2>
        <div className="surface-panel overflow-hidden rounded-lg border border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-background/45">
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
                    className="border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.image ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.image} alt={user.name || ""} />
                            <AvatarFallback className="text-[10px]">
                              {(user.name || "?")[0]}
                            </AvatarFallback>
                          </Avatar>
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
