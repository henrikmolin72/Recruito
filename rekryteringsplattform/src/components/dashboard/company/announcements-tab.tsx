"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createJobAnnouncement } from "@/lib/actions/jobs";
import { formatDate } from "@/lib/utils";
import { Megaphone, Send } from "lucide-react";

interface Announcement {
    id: string;
    message: string;
    created_at: string;
}

interface AnnouncementsTabProps {
    jobId: string;
    initialAnnouncements: Announcement[];
    /** Admin view: history only, no compose form (posting as admin: add when asked). */
    readOnly?: boolean;
}

export function AnnouncementsTab({ jobId, initialAnnouncements, readOnly = false }: AnnouncementsTabProps) {
    const [announcements, setAnnouncements] = useState(initialAnnouncements);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        const result = await createJobAnnouncement(jobId, message.trim());
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Announcement sent to all recruiters");
            setAnnouncements([
                { id: Date.now().toString(), message: message.trim(), created_at: new Date().toISOString() },
                ...announcements,
            ]);
            setMessage("");
        }
        setSending(false);
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* New announcement form */}
            {!readOnly && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                        <Megaphone className="h-4 w-4" /> New Announcement
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Send an update to all recruiters working on this assignment. They will receive a notification and see it in the job description.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g. We have updated the salary range. We are now also open to remote candidates..."
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={sending || !message.trim()} className="gap-2">
                                <Send className="h-4 w-4" />
                                {sending ? "Sending…" : "Send to Recruiters"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Announcement history */}
            {announcements.length > 0 ? (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">History</h4>
                    {announcements.map((a) => (
                        <div key={a.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">{formatDate(a.created_at)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                    {readOnly ? "No announcements yet." : "No announcements yet. Send your first update above."}
                </div>
            )}
        </div>
    );
}
