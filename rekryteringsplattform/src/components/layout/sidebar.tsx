"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  CreditCard,
  Building2,
  UserSearch,
  Shield,
  DollarSign,
  Settings,
  LogOut,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const companyNav: NavItem[] = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Jobb", href: "/company/jobs", icon: Briefcase },
  { label: "Kandidater", href: "/company/candidates", icon: Users },
  { label: "Meddelanden", href: "/company/messages", icon: MessageSquare },
  { label: "Fakturering", href: "/company/billing", icon: CreditCard },
  { label: "Profil", href: "/company/profile", icon: Building2 },
];

const recruiterNav: NavItem[] = [
  { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard },
  { label: "AI-matchning", href: "/recruiter/matching", icon: Sparkles },
  { label: "Hitta jobb", href: "/recruiter/jobs", icon: Briefcase },
  { label: "Mina mandat", href: "/recruiter/mandates", icon: UserSearch },
  { label: "Kandidater", href: "/recruiter/candidates", icon: Users },
  { label: "Meddelanden", href: "/recruiter/messages", icon: MessageSquare },
  { label: "Intäkter", href: "/recruiter/earnings", icon: DollarSign },
  { label: "Kandidatskydd", href: "/recruiter/ownership", icon: Shield },
  { label: "Profil", href: "/recruiter/profile", icon: Building2 },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Företag", href: "/admin/companies", icon: Building2 },
  { label: "Rekryterare", href: "/admin/recruiters", icon: UserSearch },
  { label: "Jobb", href: "/admin/jobs", icon: Briefcase },
  { label: "Placeringar", href: "/admin/placements", icon: Users },
  { label: "Kandidatskydd", href: "/admin/ownership", icon: Shield },
  { label: "Analys", href: "/admin/analytics", icon: BarChart3 },
  { label: "Inställningar", href: "/admin/settings", icon: Settings },
];

interface SidebarProps {
  role: "company" | "recruiter" | "admin";
  userName?: string;
  companyName?: string;
}

export function Sidebar({ role, userName, companyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems =
    role === "company"
      ? companyNav
      : role === "recruiter"
        ? recruiterNav
        : adminNav;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="text-xl font-bold text-brand-600">
          Rekryto
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
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
                  ? "bg-brand-50 text-brand-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{userName}</p>
          {companyName && (
            <p className="text-xs text-muted-foreground">{companyName}</p>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logga ut
        </Button>
      </div>
    </aside>
  );
}
