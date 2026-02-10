"use client";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails } from "@/lib/messaging/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Igar";
  if (diffDays < 7) {
    return date.toLocaleDateString("sv-SE", { weekday: "short" });
  }
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = conv.other_participant?.full_name.toLowerCase() || "";
    const job = conv.job_title?.toLowerCase() || "";
    return name.includes(query) || job.includes(query);
  });

  return (
    <div className="flex h-full flex-col border-r bg-white">
      {/* Search header */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sok konversationer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Inga matchande konversationer" : "Inga konversationer annu"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50",
                selectedId === conv.id && "bg-blue-50 hover:bg-blue-50"
              )}
            >
              {/* Avatar */}
              <Avatar className="mt-0.5 size-10 shrink-0">
                {conv.other_participant?.avatar_url && (
                  <AvatarImage
                    src={conv.other_participant.avatar_url}
                    alt={conv.other_participant.full_name}
                  />
                )}
                <AvatarFallback className="bg-blue-100 text-xs font-medium text-blue-700">
                  {conv.other_participant
                    ? getInitials(conv.other_participant.full_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      conv.unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                    )}
                  >
                    {conv.other_participant?.full_name || "Okand anvandare"}
                  </span>
                  {conv.last_message && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatMessageTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>

                {conv.job_title && (
                  <p className="truncate text-xs text-blue-600">
                    {conv.job_title}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-xs",
                      conv.unread
                        ? "font-medium text-gray-800"
                        : "text-muted-foreground"
                    )}
                  >
                    {conv.last_message?.content || "Ingen meddelanden annu"}
                  </p>

                  {/* Unread indicator */}
                  {conv.unread && (
                    <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
