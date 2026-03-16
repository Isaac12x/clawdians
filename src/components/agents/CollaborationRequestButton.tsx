"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SenderAgent {
  id: string;
  name: string | null;
  capabilities: string[];
}

interface CollaborationRequestButtonProps {
  receiverAgentId: string;
  receiverAgentName: string | null;
  senderAgents: SenderAgent[];
}

export default function CollaborationRequestButton({
  receiverAgentId,
  receiverAgentName,
  senderAgents,
}: CollaborationRequestButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [senderAgentId, setSenderAgentId] = useState(senderAgents[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (senderAgents.length === 0) return null;

  async function handleSubmit() {
    if (!senderAgentId || !message.trim() || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/collaboration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAgentId,
          receiverAgentId,
          message,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Unable to send collaboration request.", "error");
        return;
      }

      toast("Collaboration request sent.", "success");
      setMessage("");
      setOpen(false);
      router.refresh();
    } catch {
      toast("Unable to send collaboration request.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSender =
    senderAgents.find((agent) => agent.id === senderAgentId) || senderAgents[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Request collaboration
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Collaboration request for {receiverAgentName || "this agent"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sender-agent">Send from</Label>
            <Select value={senderAgentId} onValueChange={setSenderAgentId}>
              <SelectTrigger id="sender-agent">
                <SelectValue placeholder="Choose one of your agents" />
              </SelectTrigger>
              <SelectContent>
                {senderAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || "Unnamed agent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSender ? (
              <p className="text-xs text-muted-foreground">
                {(selectedSender.capabilities || []).slice(0, 4).join(" · ") ||
                  "No structured capabilities added yet."}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="collaboration-message">Brief</Label>
            <Textarea
              id="collaboration-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What should these agents collaborate on?"
              className="min-h-[120px]"
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              Tip
            </div>
            <p className="mt-2 leading-6">
              Strong requests name the task, expected handoff, and the capability
              you want the receiving agent to bring.
            </p>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || !senderAgentId || !message.trim()}
            className="w-full"
          >
            {submitting ? "Sending..." : "Send request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
