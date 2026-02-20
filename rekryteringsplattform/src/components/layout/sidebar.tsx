"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/shared/app-logo";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  CreditCard,
  Building2,
  Search,
  FileCheck,
  Wallet,
  UserCircle,
  UserCheck,
  Banknote,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const COMPANY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Jobb", href: "/company/jobs", icon: Briefcase },
  { label: "Kandidater", href: "/company/candidates", icon: Users },
  { label: "Meddelanden", href: "/company/messages", icon: MessageSquare },
  { label: "Fakturering", href: "/company/billing", icon: CreditCard },
  { label: "Profil", href: "/company/profile", icon: Building2 },
];

const RECRUITER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard },
  { label: "Bläddra jobb", href: "/recruiter/jobs", icon: Search },
  { label: "Mina mandat", href: "/recruiter/mandates", icon: FileCheck, badge: "3/5" },
  { label: "Kandidater", href: "/recruiter/candidates", icon: Users },
  { label: "Meddelanden", href: "/recruiter/messages", icon: MessageSquare },
  { label: "Intäkter", href: "/recruiter/earnings", icon: Wallet },
  { label: "Profil", href: "/recruiter/profile", icon: UserCircle },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rekryterare", href: "/admin/recruiters", icon: UserCheck, badge: "4" },
  { label: "Företag", href: "/admin/companies", icon: Building2 },
  { label: "Jobb", href: "/admin/jobs", icon: Briefcase },
  { label: "Placeringar", href: "/admin/placements", icon: Banknote },
  { label: "Inställningar", href: "/admin/settings", icon: Settings },
];

export const NAV_MAP: Record<string, NavItem[]> = {
  company: COMPANY_NAV,
  recruiter: RECRUITER_NAV,
  admin: ADMIN_NAV,
};

import { useState, useEffect } from "react";

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navItems = NAV_MAP[role] || COMPANY_NAV;
  const [userData, setUserData] = useState<{ fullName: string, initials: string } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    import("@/lib/actions/user").then(({ getSidebarData }) => {
      getSidebarData().then(data => {
        if (data) setUserData(data);
      });
    });

    const fetchUnread = () => {
      import("@/lib/actions/messages").then(({ getUnreadMessageCount }) => {
        getUnreadMessageCount().then(count => {
          setUnreadMessages(count);
        });
      });
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const isRecruiter = role === "recruiter";

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col w-64 border-r border-border transition-all duration-300",
      isRecruiter ? "bg-slate-900 border-slate-800 text-white" : "bg-white text-foreground"
    )}>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo
            size="sm"
            textClassName={isRecruiter ? "text-white" : "text-brand-600"}
          />
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));
          const badge = item.label === "Meddelanden" && unreadMessages > 0 ? unreadMessages.toString() : item.badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                isActive
                  ? (isRecruiter ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "bg-brand-50 text-brand-600")
                  : (isRecruiter ? "text-slate-400 hover:bg-slate-800/50 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "" : (isRecruiter ? "text-slate-500 group-hover:text-brand-400" : "text-muted-foreground")
              )} />
              {item.label}
              {badge && (
                <span className={cn(
                  "ml-auto text-xs rounded-full px-2 py-0.5 font-bold transition-transform group-hover:scale-110",
                  item.label === "Meddelanden"
                    ? "bg-danger-500 text-white shadow-sm"
                    : (isRecruiter ? "bg-white/10 text-brand-400" : "bg-brand-100 text-brand-600")
                )}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn(
        "p-4 border-t",
        isRecruiter ? "border-slate-800 bg-slate-950/30" : "border-border bg-muted/10 font-medium"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center border transition-colors",
            isRecruiter ? "bg-slate-800 border-slate-700 text-brand-400 font-black" : "bg-brand-100 border-brand-200 text-brand-600 font-bold"
          )}>
            <span className="text-xs uppercase tracking-tighter">
              {userData?.initials || (role === "company" ? "AB" : role === "recruiter" ? "EL" : "AD")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-bold truncate leading-none mb-1",
              isRecruiter ? "text-white" : "text-foreground"
            )}>
              {userData?.fullName || (role === "company" ? "TechCorp AB" : role === "recruiter" ? "Erik Lindgren" : "Admin")}
            </p>
            <p className={cn(
              "text-[9px] uppercase font-black tracking-widest opacity-70",
              isRecruiter ? "text-brand-400" : "text-muted-foreground"
            )}>
              {role === "recruiter" ? "Professionell" : "Corporate"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
