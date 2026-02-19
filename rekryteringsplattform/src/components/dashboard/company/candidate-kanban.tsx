"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateCandidateStatus } from "@/lib/actions/candidates";
import { toast } from "sonner";
import {
    Users,
    MessageSquare,
    Calendar,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    MoveRight,
    PauseCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    current_title: string;
    status: string;
    recruiter?: {
        profile?: {
            full_name: string;
        };
    };
}

const COLUMN_CONFIG = [
    { title: "Nya / Granskas", statuses: ["submitted", "reviewing"], color: "bg-blue-500" },
    { title: "Intervju", statuses: ["interview"], color: "bg-purple-500" },
    { title: "Erbjudande", statuses: ["offered"], color: "bg-amber-500" },
    { title: "Beslut", statuses: ["hired", "rejected"], color: "bg-slate-500" },
    { title: "Pausade", statuses: ["paused"], color: "bg-orange-400" }
];

export function CandidateKanban({ candidates: initialCandidates, jobId }: { candidates: Candidate[], jobId: string }) {
    const [candidates, setCandidates] = useState(initialCandidates);

    const handleStatusChange = async (candidateId: string, newStatus: string) => {
        // Optimistic update
        const oldCandidates = [...candidates];
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));

        const result = await updateCandidateStatus(candidateId, jobId, newStatus);
        if (result.error) {
            toast.error("Kunde inte uppdatera status: " + result.error);
            setCandidates(oldCandidates);
        } else {
            toast.success("Status uppdaterad");
        }
    };

    return (
        <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] scrollbar-hide">
            {COLUMN_CONFIG.map((col) => (
                <div key={col.title} className="flex-1 min-w-[300px] max-w-[350px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", col.color)} />
                            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">{col.title}</h3>
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {candidates.filter(c => col.statuses.includes(c.status)).length}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl p-3 min-h-[500px] border border-slate-100 shadow-inner">
                        <AnimatePresence mode="popLayout">
                            {candidates
                                .filter(c => col.statuses.includes(c.status))
                                .map((candidate) => (
                                    <motion.div
                                        key={candidate.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group mb-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-200 transition-all cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm">
                                                    {candidate.first_name[0]}{candidate.last_name[0]}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-900 leading-none mb-1">
                                                        {candidate.first_name} {candidate.last_name}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 truncate w-32">
                                                        {candidate.current_title || "Ingen titel angiven"}
                                                    </p>
                                                </div>
                                            </div>
                                            <DropdownMenuAction
                                                candidate={candidate}
                                                onStatusChange={(s) => handleStatusChange(candidate.id, s)}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            {candidate.status === 'submitted' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Inskickad</span>}
                                            {candidate.status === 'reviewing' && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Granskas</span>}
                                            {candidate.status === 'interview' && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Intervju</span>}
                                            {candidate.status === 'offered' && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Erbjudande</span>}
                                            {candidate.status === 'hired' && <span className="text-[10px] bg-success-50 text-success-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Anställd</span>}
                                            {candidate.status === 'rejected' && <span className="text-[10px] bg-danger-50 text-danger-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Avböjd</span>}
                                            {candidate.status === 'paused' && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Pausad</span>}
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex -space-x-1">
                                                <div className="h-5 w-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                                                    R
                                                </div>
                                            </div>
                                            <Link
                                                href={`/company/jobs/${jobId}/candidates/${candidate.id}`}
                                                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                            >
                                                Visa profil <MoveRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </motion.div>
                                ))}
                        </AnimatePresence>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DropdownMenuAction({ candidate, onStatusChange }: { candidate: Candidate, onStatusChange: (s: string) => void }) {
    const status = candidate.status;

    // Build actions based on current status — forward, backward, pause, reject
    const allActions: { label: string; value: string; icon: React.ReactNode; className?: string }[] = [];

    if (status !== 'submitted') allActions.push({ label: "Presenterad", value: "submitted", icon: <Users className="h-3.5 w-3.5 text-blue-400" /> });
    if (status !== 'reviewing') allActions.push({ label: "Granska", value: "reviewing", icon: <Calendar className="h-3.5 w-3.5 text-indigo-400" /> });
    if (status !== 'interview') allActions.push({ label: "Intervju", value: "interview", icon: <MessageSquare className="h-3.5 w-3.5 text-purple-400" /> });
    if (status !== 'offered') allActions.push({ label: "Erbjudande", value: "offered", icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" /> });
    if (status !== 'hired') allActions.push({ label: "Anställd", value: "hired", icon: <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />, className: "text-success-600 font-bold" });

    return (
        <div className="relative group/menu">
            <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
            </button>
            <div className="hidden group-hover/menu:block absolute right-0 top-full mt-1 w-44 bg-white shadow-xl border border-slate-200 rounded-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 mb-1">Flytta till</p>
                {allActions.map((action) => (
                    <button key={action.value} onClick={() => onStatusChange(action.value)} className={cn("w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2", action.className)}>
                        {action.icon} {action.label}
                    </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                    {status !== 'paused' && (
                        <button onClick={() => onStatusChange('paused')} className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 text-orange-600 flex items-center gap-2">
                            <PauseCircle className="h-3.5 w-3.5" /> Pausa kandidat
                        </button>
                    )}
                    {status !== 'rejected' && (
                        <button onClick={() => onStatusChange('rejected')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-danger-500 flex items-center gap-2">
                            <XCircle className="h-3.5 w-3.5" /> Avböj
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Sparkles({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}
