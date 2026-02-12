"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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

const NAV_MAP: Record<string, NavItem[]> = {
  company: COMPANY_NAV,
  recruiter: RECRUITER_NAV,
  admin: ADMIN_NAV,
};

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navItems = NAV_MAP[role] || COMPANY_NAV;

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-border bg-white">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-xl font-bold text-brand-600">Rekryto</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto text-xs bg-brand-100 text-brand-600 rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-sm font-medium text-brand-600">
              {role === "company" ? "AB" : role === "recruiter" ? "EL" : "AD"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {role === "company" ? "TechCorp AB" : role === "recruiter" ? "Erik Lindgren" : "Admin"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
