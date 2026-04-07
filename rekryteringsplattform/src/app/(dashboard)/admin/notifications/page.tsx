"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, Users, Building2, ChevronDown, ChevronUp, CheckCircle, Clock } from "lucide-react";
import {
    getNotificationRecipients,
    sendAdminNotification,
    getAdminNotificationHistory,
} from "@/lib/actions/admin";

type Audience = "all" | "all_recruiters" | "all_companies" | "specific";

interface Recipient {
    id: string;
    name: string;
    email: string;
    type: "recruiter" | "company";
    status?: string;
}

export default function AdminNotificationsPage() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [link, setLink] = useState("");
    const [audience, setAudience] = useState<Audience>("all");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [recruiters, setRecruiters] = useState<Recipient[]>([]);
    const [companies, setCompanies] = useState<Recipient[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);
    const [showRecipients, setShowRecipients] = useState(false);

    useEffect(() => {
        getNotificationRecipients().then(data => {
            setRecruiters(data.recruiters);
            setCompanies(data.companies);
        });
        getAdminNotificationHistory().then(setHistory);
    }, []);

    const handleSend = async () => {
        setSending(true);
        setResult(null);

        const res = await sendAdminNotification({
            title,
            body,
            link: link || undefined,
            audience,
            recipientIds: audience === "specific" ? selectedIds : undefined,
        });

        setResult(res);
        setSending(false);

        if (res.success) {
            setTitle("");
            setBody("");
            setLink("");
            setSelectedIds([]);
            // Refresh history
            getAdminNotificationHistory().then(setHistory);
        }
    };

    const toggleRecipient = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const recipientCount =
        audience === "all" ? recruiters.length + companies.length
        : audience === "all_recruiters" ? recruiters.length
        : audience === "all_companies" ? companies.length
        : selectedIds.length;

    const allRecipients = [...recruiters, ...companies];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">Send notifications to recruiters and companies</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Compose Notification */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Compose Notification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Audience Selection */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Audience</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setAudience("all"); setSelectedIds([]); }}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${audience === "all" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-border hover:bg-muted"}`}
                                >
                                    <Users className="h-4 w-4 mb-1 mx-auto" />
                                    All Users
                                </button>
                                <button
                                    onClick={() => { setAudience("all_recruiters"); setSelectedIds([]); }}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${audience === "all_recruiters" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-border hover:bg-muted"}`}
                                >
                                    <Users className="h-4 w-4 mb-1 mx-auto" />
                                    All Recruiters
                                </button>
                                <button
                                    onClick={() => { setAudience("all_companies"); setSelectedIds([]); }}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${audience === "all_companies" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-border hover:bg-muted"}`}
                                >
                                    <Building2 className="h-4 w-4 mb-1 mx-auto" />
                                    All Companies
                                </button>
                                <button
                                    onClick={() => setAudience("specific")}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${audience === "specific" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-border hover:bg-muted"}`}
                                >
                                    <Send className="h-4 w-4 mb-1 mx-auto" />
                                    Specific Users
                                </button>
                            </div>
                        </div>

                        {/* Specific Recipients Picker */}
                        {audience === "specific" && (
                            <div>
                                <button
                                    onClick={() => setShowRecipients(!showRecipients)}
                                    className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                                >
                                    {showRecipients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    Select Recipients ({selectedIds.length} selected)
                                </button>

                                {showRecipients && (
                                    <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg divide-y">
                                        {allRecipients.map(r => (
                                            <label
                                                key={r.id}
                                                className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(r.id)}
                                                    onChange={() => toggleRecipient(r.id)}
                                                    className="rounded border-border"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{r.name}</p>
                                                    <p className="text-xs text-muted-foreground">{r.email}</p>
                                                </div>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${r.type === "recruiter" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                                    {r.type}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. New Feature Available"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Message</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Write your notification message..."
                                rows={4}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                            />
                        </div>

                        {/* Link (optional) */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Link (optional)</label>
                            <input
                                type="text"
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                placeholder="e.g. /recruiter/jobs"
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                        </div>

                        {/* Result */}
                        {result && (
                            <div className={`p-3 rounded-lg text-sm ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                {result.success
                                    ? `Notification sent to ${result.count} recipient${result.count !== 1 ? "s" : ""}!`
                                    : result.error
                                }
                            </div>
                        )}

                        {/* Send Button */}
                        <Button
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !body.trim() || (audience === "specific" && selectedIds.length === 0)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {sending ? (
                                "Sending..."
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Notification History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Sent Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {history.map((n, idx) => (
                                    <div key={idx} className="p-3 bg-muted rounded-lg">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">{n.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                                {n.link && (
                                                    <p className="text-xs text-emerald-600 mt-1">Link: {n.link}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(n.created_at).toLocaleDateString("sv-SE")}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(n.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                <Send className="h-3 w-3" />
                                                {n.recipientCount} sent
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-600">
                                                <CheckCircle className="h-3 w-3" />
                                                {n.readCount} read
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
