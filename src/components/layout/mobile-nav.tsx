"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";
import { X } from "lucide-react";
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
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_MAP: Record<string, NavItem[]> = {
  company: [
    { label: "Dashboard", href: "/company", icon: LayoutDashboard },
    { label: "Jobb", href: "/company/jobs", icon: Briefcase },
    { label: "Kandidater", href: "/company/candidates", icon: Users },
    { label: "Meddelanden", href: "/company/messages", icon: MessageSquare },
    { label: "Fakturering", href: "/company/billing", icon: CreditCard },
    { label: "Profil", href: "/company/profile", icon: Building2 },
  ],
  recruiter: [
    { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard },
    { label: "Bläddra jobb", href: "/recruiter/jobs", icon: Search },
    { label: "Mina mandat", href: "/recruiter/mandates", icon: FileCheck },
    { label: "Kandidater", href: "/recruiter/candidates", icon: Users },
    { label: "Meddelanden", href: "/recruiter/messages", icon: MessageSquare },
    { label: "Intäkter", href: "/recruiter/earnings", icon: Wallet },
    { label: "Profil", href: "/recruiter/profile", icon: UserCircle },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Rekryterare", href: "/admin/recruiters", icon: UserCheck },
    { label: "Företag", href: "/admin/companies", icon: Building2 },
    { label: "Jobb", href: "/admin/jobs", icon: Briefcase },
    { label: "Placeringar", href: "/admin/placements", icon: Banknote },
    { label: "Inställningar", href: "/admin/settings", icon: Settings },
  ],
};

interface MobileNavProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ role, open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = NAV_MAP[role] || [];

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <span className="text-xl font-bold text-brand-600">Rekryto</span>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-100 text-brand-600"
                    : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
