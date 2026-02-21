"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Briefcase, UserPlus, CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

type Notification = {
    id: string;
    title: string;
    body: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
    user_id: string;
};

// Helper for type-specific icons
const getNotificationIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('meddelande')) return <MessageSquare className="h-4 w-4 text-blue-500" />;
    if (t.includes('nytt jobb') || t.includes('uppdrag')) return <Briefcase className="h-4 w-4 text-brand-500" />;
    if (t.includes('kandidat')) return <UserPlus className="h-4 w-4 text-purple-500" />;
    if (t.includes('utbetalning') || t.includes('faktura')) return <CreditCard className="h-4 w-4 text-success-500" />;
    if (t.includes('godkänd') || t.includes('klar')) return <CheckCircle2 className="h-4 w-4 text-success-500" />;
    if (t.includes('avvisad') || t.includes('fel')) return <XCircle className="h-4 w-4 text-danger-500" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
};

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { t } = useTranslations();

    const fetchNotifications = async () => {
        const data = await getNotifications();
        setNotifications((data as any) || []);
    };

    useEffect(() => {
        const timer = setTimeout(fetchNotifications, 0);
        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }
        setOpen(false);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    return (
        <div className="relative group">
            <button
                className="relative p-2 hover:bg-muted rounded-lg transition-all active:scale-95"
                onClick={() => setOpen(!open)}
            >
                <Bell className="h-5 w-5 text-muted-foreground hover:text-brand-600 transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger-500 text-[10px] text-white flex items-center justify-center font-bold border-2 border-white animate-in zoom-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-border/50 py-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center bg-white/50">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">{t("components.notificationsTitle")}</h3>
                            <p className="text-[10px] text-muted-foreground">{t("components.notificationsUnreadCount").replace("{count}", String(unreadCount))}</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAllRead();
                                }}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                            >
                                {t("components.markAllRead")}
                            </button>
                        )}
                    </div>

                    <div className="max-h-[450px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 mb-3">
                                    <Bell className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <p>{t("components.noNewNotifications")}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "px-5 py-4 hover:bg-muted/50 cursor-pointer transition-colors relative",
                                            !notification.is_read ? "bg-brand-50/30" : "bg-transparent"
                                        )}
                                    >
                                        {!notification.is_read && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-full" />
                                        )}
                                        <div className="flex gap-4">
                                            <div className="mt-1 flex-shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-white border border-border/50 shadow-sm flex items-center justify-center">
                                                    {getNotificationIcon(notification.title)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className={cn("text-sm leading-tight", !notification.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {new Date(notification.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {notification.body}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
