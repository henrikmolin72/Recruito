"use client";
import { useEffect, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import { markConversationRead } from "@/lib/messaging/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  jobTitle?: string | null;
  otherParticipantName?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Idag";
  if (diffDays === 1) return "Igar";
  return date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function MessageThread({
  conversationId,
  currentUserId,
  jobTitle,
  otherParticipantName,
}: MessageThreadProps) {
  const messages = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark conversation as read when opening or receiving messages
  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [conversationId, messages.length]);

  if (!conversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 text-center">
        <MessageSquare className="mb-3 size-12 text-muted-foreground" />
        <h3 className="text-lg font-medium text-gray-700">
          Valj en konversation
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Valj en konversation fran listan for att se meddelanden
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-gray-900">
            {otherParticipantName || "Konversation"}
          </h2>
          {jobTitle && (
            <p className="truncate text-xs text-muted-foreground">
              {jobTitle}
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Inga meddelanden annu. Skriv ett meddelande for att borja konversationen.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;
              const showDateSeparator =
                index === 0 ||
                !isSameDay(messages[index - 1].created_at, msg.created_at);

              // Show avatar/name when sender changes or after date separator
              const showSenderInfo =
                !isOwn &&
                (index === 0 ||
                  showDateSeparator ||
                  messages[index - 1].sender_id !== msg.sender_id);

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDateSeparator && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateSeparator(msg.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}

                  {/* System message */}
                  {msg.is_system_message ? (
                    <div className="my-2 text-center">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    /* Regular message */
                    <div
                      className={cn(
                        "flex gap-2",
                        isOwn ? "justify-end" : "justify-start",
                        showSenderInfo ? "mt-3" : "mt-0.5"
                      )}
                    >
                      {/* Avatar for other's messages */}
                      {!isOwn && (
                        <div className="w-8 shrink-0">
                          {showSenderInfo && (
                            <Avatar className="size-8">
                              {msg.sender?.avatar_url && (
                                <AvatarImage
                                  src={msg.sender.avatar_url}
                                  alt={msg.sender.full_name}
                                />
                              )}
                              <AvatarFallback className="bg-gray-200 text-xs font-medium text-gray-600">
                                {msg.sender
                                  ? getInitials(msg.sender.full_name)
                                  : "?"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[70%]",
                          isOwn ? "items-end" : "items-start"
                        )}
                      >
                        {/* Sender name */}
                        {showSenderInfo && msg.sender && (
                          <p className="mb-0.5 text-xs font-medium text-gray-600">
                            {msg.sender.full_name}
                          </p>
                        )}

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                            isOwn
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md bg-white text-gray-900 shadow-sm ring-1 ring-gray-100"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <p
                          className={cn(
                            "mt-0.5 text-[10px] text-muted-foreground",
                            isOwn ? "text-right" : "text-left"
                          )}
                        >
                          {formatMessageTimestamp(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
