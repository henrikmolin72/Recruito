"use client"

import { useState } from "react";
import { CandidateChat } from "./candidate-chat";
import { sendRecruitorMessage } from "@/lib/actions/messages";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_system_message: boolean;
    sender?: { full_name: string; role: string };
}

interface TabbedCandidateChatProps {
    candidateId: string;
    jobId: string;
    clientMessages: Message[];
    recruitorMessages: Message[];
    currentUserId: string;
    candidate?: { first_name: string; last_name: string; current_title: string; status: string };
    clientTabLabel: string;
    // Which PRIVATE Recruito thread this viewer owns: the company side polls/sends
    // 'recruito_company', the recruiter side 'recruito_recruiter'. The two never
    // share a thread (migration 060 privacy split).
    recruitorConversationType: 'recruito_company' | 'recruito_recruiter';
}

export function TabbedCandidateChat({
    candidateId,
    jobId,
    clientMessages,
    recruitorMessages,
    currentUserId,
    candidate,
    clientTabLabel,
    recruitorConversationType,
}: TabbedCandidateChatProps) {
    const [activeTab, setActiveTab] = useState<"client" | "recruito">("client");

    return (
        <div className="space-y-0">
            <div className="flex border-b border-slate-200 mb-0">
                <button
                    onClick={() => setActiveTab("client")}
                    className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                        activeTab === "client"
                            ? "border-brand-600 text-brand-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    {clientTabLabel}
                </button>
                <button
                    onClick={() => setActiveTab("recruito")}
                    className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                        activeTab === "recruito"
                            ? "border-brand-600 text-brand-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    Chat with Recruito
                </button>
            </div>

            <div className={activeTab === "client" ? "block" : "hidden"}>
                <CandidateChat
                    candidateId={candidateId}
                    jobId={jobId}
                    initialMessages={clientMessages}
                    currentUserId={currentUserId}
                    candidate={candidate}
                />
            </div>
            <div className={activeTab === "recruito" ? "block" : "hidden"}>
                <CandidateChat
                    candidateId={candidateId}
                    jobId={jobId}
                    initialMessages={recruitorMessages}
                    currentUserId={currentUserId}
                    candidate={candidate}
                    conversationType={recruitorConversationType}
                    sendMessageFn={sendRecruitorMessage}
                />
            </div>
        </div>
    );
}
