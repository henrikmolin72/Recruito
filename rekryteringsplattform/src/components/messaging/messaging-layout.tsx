"use client";
import { useState, useCallback } from "react";
import type { ConversationWithDetails } from "@/lib/messaging/actions";
import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { MessageInput } from "@/components/messaging/message-input";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagingLayoutProps {
  initialConversations: ConversationWithDetails[];
  currentUserId: string;
}

export function MessagingLayout({
  initialConversations,
  currentUserId,
}: MessagingLayoutProps) {
  const [conversations] = useState<ConversationWithDetails[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleSelect = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border bg-white shadow-sm">
      {/* Conversation list - left panel */}
      <div
        className={cn(
          "w-full shrink-0 md:w-80 lg:w-96",
          selectedId ? "hidden md:block" : "block"
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Message thread + input - right panel */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          selectedId ? "flex" : "hidden md:flex"
        )}
      >
        {selectedId ? (
          <>
            {/* Mobile back button + thread header */}
            <div className="flex items-center border-b bg-white md:hidden">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-3 text-sm text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="size-4" />
                Tillbaka
              </button>
            </div>
            <MessageThread
              conversationId={selectedId}
              currentUserId={currentUserId}
              jobTitle={selectedConversation?.job_title}
              otherParticipantName={
                selectedConversation?.other_participant?.full_name
              }
            />
            <MessageInput conversationId={selectedId} />
          </>
        ) : (
          /* Empty state when no conversation selected (visible on md+) */
          <div className="hidden flex-1 flex-col items-center justify-center bg-gray-50 md:flex">
            <div className="rounded-full bg-gray-100 p-4">
              <svg
                className="size-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-700">
              Valj en konversation
            </h3>
            <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
              Valj en konversation fran listan till vanster for att se och skicka meddelanden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
