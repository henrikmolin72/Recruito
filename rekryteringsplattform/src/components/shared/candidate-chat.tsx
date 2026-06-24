"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { sendMessage, getCandidateConversation } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_system_message: boolean;
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
    candidate?: {
        first_name: string;
        last_name: string;
        current_title: string;
        status: string;
    };
    conversationType?: 'client' | 'recruito_company' | 'recruito_recruiter';
    sendMessageFn?: (candidateId: string, jobId: string, content: string) => Promise<{ success?: boolean; error?: string }>;
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

export function CandidateChat({ candidateId, jobId, initialMessages, currentUserId, candidate, conversationType = 'client', sendMessageFn }: CandidateChatProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslations();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const pollMessages = useCallback(async () => {
        try {
            const conversation = await getCandidateConversation(candidateId, conversationType);
            if (conversation?.messages) {
                setMessages(conversation.messages);
            }
        } catch {
            // Silently ignore polling errors
        }
    }, [candidateId, conversationType]);

    useEffect(() => {
        const interval = setInterval(pollMessages, 5000);
        return () => clearInterval(interval);
    }, [pollMessages]);

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

        const activeSendFn = sendMessageFn ?? sendMessage;
        const result = await activeSendFn(candidateId, jobId, msgContent);

        if (!result.success) {
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setContent(msgContent);
        } else {
            await pollMessages();
        }
        setIsLoading(false);
    };

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
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;

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
                                    {msg.content}
                                </div>
                                <time
                                    dateTime={msg.created_at}
                                    suppressHydrationWarning
                                    className="text-[9px] text-slate-400 font-bold mt-1.5 px-1 tracking-wider uppercase"
                                >
                                    {formatMessageTime(msg.created_at)}
                                </time>
                            </div>
                        );
                    })
                )}
            </CardContent>

            <CardFooter className="p-6 pt-2 bg-slate-50/50">
                <form onSubmit={handleSend} className="flex w-full gap-3 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                    <Input
                        placeholder={t("components.chatMessagePlaceholder")}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isLoading}
                        spellCheck
                        className="flex-1 border-none bg-transparent focus-visible:ring-0 shadow-none px-4 h-11 text-sm font-medium"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !content.trim()}
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
