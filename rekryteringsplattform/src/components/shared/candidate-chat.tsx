"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { sendMessage, getCandidateConversation, uploadMessageAttachment, markConversationAsRead, getConversationReadStatus } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Sparkles, Paperclip, FileText, Download, Check, CheckCheck, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_system_message: boolean;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_size?: number | null;
    attachment_type?: string | null;
    sender?: {
        full_name: string;
        role: string;
    };
}

interface CandidateChatProps {
    candidateId: string;
    jobId: string;
    initialMessages: Message[];
    currentUserId: string;
    initialHasMore?: boolean;
    candidate?: {
        first_name: string;
        last_name: string;
        current_title: string;
        status: string;
    };
}

function formatMessageTime(createdAt: string) {
    try {
        return new Intl.DateTimeFormat("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(createdAt));
    } catch {
        return "";
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function CandidateChat({ candidateId, jobId, initialMessages, currentUserId, initialHasMore, candidate }: CandidateChatProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore ?? false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslations();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Poll for new messages every 5 seconds
    const pollMessages = useCallback(async () => {
        try {
            const conversation = await getCandidateConversation(candidateId);
            if (conversation?.messages) {
                setMessages(conversation.messages);
                setHasMore(conversation.hasMore ?? false);
                if (conversation.id) {
                    setConversationId(conversation.id);
                    // Mark as read
                    await markConversationAsRead(conversation.id);
                    // Get other person's read status
                    const readStatus = await getConversationReadStatus(conversation.id);
                    if (readStatus) {
                        setOtherReadAt(readStatus.otherLastRead);
                    }
                }
            }
        } catch {
            // Silently ignore polling errors
        }
    }, [candidateId]);

    useEffect(() => {
        const interval = setInterval(pollMessages, 5000);
        // Initial read status fetch
        pollMessages();
        return () => clearInterval(interval);
    }, [pollMessages]);

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore || messages.length === 0) return;
        setLoadingMore(true);

        const oldestMessage = messages[0];
        const conversation = await getCandidateConversation(candidateId, { before: oldestMessage.created_at });
        if (conversation?.messages) {
            setMessages(prev => [...conversation.messages, ...prev]);
            setHasMore(conversation.hasMore ?? false);
        }

        setLoadingMore(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isLoading) return;

        const msgContent = content.trim();
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content: msgContent,
            sender_id: currentUserId,
            created_at: new Date().toISOString(),
            is_system_message: false,
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setContent("");
        setIsLoading(true);

        const result = await sendMessage(candidateId, jobId, msgContent);

        if (!result.success) {
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setContent(msgContent);
        } else {
            await pollMessages();
        }
        setIsLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert(t("components.chatFileTooLarge"));
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        const uploadResult = await uploadMessageAttachment(formData);

        if ("error" in uploadResult) {
            alert(uploadResult.error);
            setIsUploading(false);
            return;
        }

        const result = await sendMessage(candidateId, jobId, "", uploadResult);

        if (result.success) {
            await pollMessages();
        }

        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Determine the last message sent by current user for read receipt display
    const lastOwnMessage = [...messages].reverse().find(m => m.sender_id === currentUserId && !m.is_system_message);
    const isLastOwnMessageRead = lastOwnMessage && otherReadAt
        ? new Date(otherReadAt) >= new Date(lastOwnMessage.created_at)
        : false;

    return (
        <Card className="flex flex-col h-[600px] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white rounded-3xl">
            {candidate && (
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-brand-600 font-black text-sm">
                            {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 leading-none mb-1">
                                {candidate.first_name} {candidate.last_name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                                {candidate.current_title || t("components.chatCandidate")}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t("components.chatStatusLabel")}</span>
                        <div className="text-xs font-bold text-brand-600 bg-white px-3 py-1 rounded-full border border-brand-100 shadow-sm">
                            {candidate.status}
                        </div>
                    </div>
                </div>
            )}

            <CardContent
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
                ref={scrollRef}
            >
                {/* Load more button */}
                {hasMore && (
                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="text-xs text-slate-400 hover:text-slate-600 gap-1"
                        >
                            <ChevronUp className="h-3 w-3" />
                            {loadingMore ? t("components.chatLoadingMore") : t("components.chatLoadMore")}
                        </Button>
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Sparkles className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">{t("components.chatStartDiscussion")}</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                            {t("components.chatEmptyHint")}
                        </p>
                    </div>
                ) : (
                    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        const isLastOwn = lastOwnMessage?.id === msg.id;

                        if (msg.is_system_message) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <div className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-tighter px-4 py-1.5 rounded-full border border-slate-100 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {isMe ? t("components.chatYou") : (msg.sender?.full_name || t("common.unknown"))}
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "rounded-2xl px-5 py-3 text-sm transition-all duration-200",
                                        isMe
                                            ? "bg-brand-600 text-white rounded-tr-none shadow-lg shadow-brand-500/20"
                                            : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                                    )}
                                >
                                    {msg.content && !msg.attachment_url && msg.content}
                                    {msg.content && msg.attachment_url && <p className="mb-2">{msg.content}</p>}

                                    {/* File attachment display */}
                                    {msg.attachment_url && (
                                        <a
                                            href={msg.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                                "flex items-center gap-2 rounded-xl p-2 text-xs font-medium",
                                                isMe
                                                    ? "bg-brand-500/30 text-white hover:bg-brand-500/40"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <FileText className="h-4 w-4 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate">{msg.attachment_name || t("components.chatFileAttachment")}</p>
                                                {msg.attachment_size && (
                                                    <p className={cn("text-[10px]", isMe ? "text-white/70" : "text-slate-400")}>
                                                        {formatFileSize(msg.attachment_size)}
                                                    </p>
                                                )}
                                            </div>
                                            <Download className="h-3.5 w-3.5 flex-shrink-0" />
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                    <time
                                        dateTime={msg.created_at}
                                        suppressHydrationWarning
                                        className="text-[9px] text-slate-400 font-bold tracking-wider uppercase"
                                    >
                                        {formatMessageTime(msg.created_at)}
                                    </time>
                                    {/* Read receipt indicator for own messages */}
                                    {isMe && isLastOwn && (
                                        <span className="flex items-center" title={isLastOwnMessageRead ? t("components.chatReadReceipt") : t("components.chatDelivered")}>
                                            {isLastOwnMessageRead ? (
                                                <CheckCheck className="h-3 w-3 text-brand-500" />
                                            ) : (
                                                <Check className="h-3 w-3 text-slate-300" />
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>

            <CardFooter className="p-6 pt-2 bg-slate-50/50">
                <form onSubmit={handleSend} className="flex w-full gap-3 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv"
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading}
                        className="h-11 w-11 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                        title={t("components.chatAttachFile")}
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Paperclip className="h-4 w-4" />
                        )}
                    </Button>
                    <Input
                        placeholder={t("components.chatMessagePlaceholder")}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isLoading || isUploading}
                        className="flex-1 border-none bg-transparent focus-visible:ring-0 shadow-none px-4 h-11 text-sm font-medium"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || isUploading || !content.trim()}
                        className="h-11 w-11 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
