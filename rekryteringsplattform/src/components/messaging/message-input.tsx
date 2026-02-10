"use client";
import { useRef, useState, useCallback } from "react";
import { sendMessage } from "@/lib/messaging/actions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  conversationId: string | null;
  disabled?: boolean;
}

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!conversationId || !content.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await sendMessage(conversationId, content);
      if (!error) {
        setContent("");
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    } finally {
      setSending(false);
      // Re-focus the textarea after sending
      textareaRef.current?.focus();
    }
  }, [conversationId, content, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends the message
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const isDisabled = disabled || !conversationId;

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? "Valj en konversation for att skicka meddelanden"
              : "Skriv ett meddelande..."
          }
          disabled={isDisabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-40 min-h-[40px]"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={isDisabled || !content.trim() || sending}
          size="icon"
          className="shrink-0"
        >
          <Send className="size-4" />
          <span className="sr-only">Skicka</span>
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Tryck Enter for att skicka, Shift+Enter for ny rad
      </p>
    </div>
  );
}
