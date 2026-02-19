"use client"

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { CandidateChat } from "@/components/shared/candidate-chat";
import { cn } from "@/lib/utils";
import { markConversationAsRead } from "@/lib/actions/messages";

interface RecruiterInboxProps {
    initialConversations: any[];
    currentUserId: string;
}

export function RecruiterInbox({ initialConversations, currentUserId }: RecruiterInboxProps) {
    const [selectedConvId, setSelectedConvId] = useState<string | null>(
        initialConversations.length > 0 ? initialConversations[0].id : null
    );
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (selectedConvId) {
            markConversationAsRead(selectedConvId);
        }
    }, [selectedConvId]);

    const selectedConv = initialConversations.find(c => c.id === selectedConvId);

    const filteredConversations = initialConversations.filter(conv => {
        const name = `${conv.candidate?.first_name} ${conv.candidate?.last_name} (${conv.candidate?.job?.company?.company_name})`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <Card className="h-[650px] flex overflow-hidden shadow-xl border-brand-100">
            {/* Sidebar */}
            <div className="w-full md:w-80 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border bg-white">
                    <Input
                        placeholder="Sök konversationer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Inga konversationer hittades.
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const lastMsg = conv.messages?.length > 0 ? conv.messages[conv.messages.length - 1] : null;
                            const isActive = selectedConvId === conv.id;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConvId(conv.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-4 hover:bg-muted cursor-pointer border-b border-border transition-colors",
                                        isActive ? "bg-brand-50 border-r-2 border-r-brand-600" : "bg-white"
                                    )}
                                >
                                    <Avatar initials={(conv.candidate?.first_name?.[0] || "") + (conv.candidate?.last_name?.[0] || "")} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className={cn("text-sm truncate", isActive ? "font-bold text-brand-900" : "font-medium")}>
                                                {conv.candidate?.first_name} {conv.candidate?.last_name}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground">
                                                {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-brand-600 font-medium truncate mb-1">
                                            {conv.candidate?.job?.company?.company_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate italic">
                                            {lastMsg ? lastMsg.content : "Inga meddelanden än"}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="hidden md:flex flex-1 flex-col bg-white">
                {selectedConv ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-4 border-b border-border bg-white flex items-center justify-between">
                            <div>
                                <p className="font-bold text-brand-900">{selectedConv.candidate?.first_name} {selectedConv.candidate?.last_name}</p>
                                <p className="text-xs text-muted-foreground">Applikation för: <span className="font-medium text-foreground">{selectedConv.candidate?.job?.title}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{selectedConv.candidate?.job?.company?.company_name}</p>
                                <p className="text-[10px] text-muted-foreground italic">Direktkontakt med kund</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden p-0 border-none shadow-none">
                            <CandidateChat
                                candidateId={selectedConv.candidate_id}
                                jobId={selectedConv.job_id}
                                initialMessages={selectedConv.messages || []}
                                currentUserId={currentUserId}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                            <Avatar initials="?" size="lg" />
                        </div>
                        <p className="font-medium">Välj en konversation för att börja chatta</p>
                        <p className="text-sm">Här ser du alla dina pågående dialoger med kunder.</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
