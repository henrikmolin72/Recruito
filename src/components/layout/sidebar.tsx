"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";
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
  { label: "Mina mandat", href: "/recruiter/mandates", icon: FileCheck },
  { label: "Kandidater", href: "/recruiter/candidates", icon: Users },
  { label: "Meddelanden", href: "/recruiter/messages", icon: MessageSquare },
  { label: "Intäkter", href: "/recruiter/earnings", icon: Wallet },
  { label: "Profil", href: "/recruiter/profile", icon: UserCircle },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rekryterare", href: "/admin/recruiters", icon: UserCheck },
  { label: "Företag", href: "/admin/companies", icon: Building2 },
  { label: "Jobb", href: "/admin/jobs", icon: Briefcase },
  { label: "Placeringar", href: "/admin/placements", icon: Banknote },
  { label: "Inställningar", href: "/admin/settings", icon: Settings },
];

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case UserRole.COMPANY:
      return COMPANY_NAV;
    case UserRole.RECRUITER:
      return RECRUITER_NAV;
    case UserRole.ADMIN:
      return ADMIN_NAV;
    default:
      return [];
  }
}

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role as UserRole);

  return (
    <aside className="hidden w-64 border-r bg-white lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="text-xl font-bold text-brand-600">
          Rekryto
        </Link>
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
    </aside>
  );
}
