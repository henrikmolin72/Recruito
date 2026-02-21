"use client";

import { Plus, Briefcase, UserPlus, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickActionsProps {
    role: string;
}

export function QuickActions({ role }: QuickActionsProps) {
    const { t } = useTranslations();
    const isRecruiter = role === "recruiter";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ring-1 ring-inset",
                    isRecruiter
                        ? "bg-brand-500 text-white ring-white/10 hover:bg-brand-600"
                        : "bg-brand-600 text-white ring-brand-700 hover:bg-brand-700"
                )}>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span className="hidden sm:inline">{t("components.quickActionsLabel")}</span>
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-xl shadow-2xl border-border/50">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">
                    {t("components.quickActionsTitle")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="opacity-50" />

                {isRecruiter ? (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href="/recruiter/jobs" className="flex items-center gap-2 cursor-pointer py-2.5">
                                <Briefcase className="h-4 w-4 text-brand-500" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{t("components.quickActionFindJobs")}</span>
                                    <span className="text-[10px] text-muted-foreground">{t("components.quickActionFindJobsDesc")}</span>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/recruiter/mandates" className="flex items-center gap-2 cursor-pointer py-2.5">
                                <UserPlus className="h-4 w-4 text-brand-500" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{t("components.quickActionMyMandates")}</span>
                                    <span className="text-[10px] text-muted-foreground">{t("components.quickActionMyMandatesDesc")}</span>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href="/company/jobs/new" className="flex items-center gap-2 cursor-pointer py-2.5">
                                <Plus className="h-4 w-4 text-brand-600" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{t("components.quickActionCreateJob")}</span>
                                    <span className="text-[10px] text-muted-foreground">{t("components.quickActionCreateJobDesc")}</span>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/company/messages" className="flex items-center gap-2 cursor-pointer py-2.5">
                                <Briefcase className="h-4 w-4 text-brand-600" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{t("components.quickActionInbox")}</span>
                                    <span className="text-[10px] text-muted-foreground">{t("components.quickActionInboxDesc")}</span>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
