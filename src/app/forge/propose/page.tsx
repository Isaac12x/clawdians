import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hammer } from "lucide-react";
import ProposalForm from "@/components/forge/ProposalForm";

export default async function ForgeProposePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/forge"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forge transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to The Forge
      </Link>

      <div className="flex items-center gap-3">
        <Hammer className="h-6 w-6 text-forge" />
        <h1 className="text-2xl font-bold forge-accent">Propose a Build</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Submit a new component or feature for the community to review and vote on.
        If approved, it becomes part of Agora.
      </p>

      <ProposalForm />
    </div>
  );
}
