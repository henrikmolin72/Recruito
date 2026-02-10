"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./sidebar";
import { NotificationDropdown } from "./notification-dropdown";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  role: "company" | "recruiter" | "admin";
  userName?: string;
  companyName?: string;
  avatarUrl?: string;
}

const roleLabels: Record<string, string> = {
  company: "Foretag",
  recruiter: "Rekryterare",
  admin: "Administrator",
};

export function Header({ role, userName, companyName, avatarUrl }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  function getInitials(name?: string): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const profileHref =
    role === "company"
      ? "/company/profile"
      : role === "recruiter"
        ? "/recruiter/profile"
        : "/admin/settings";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar role={role} userName={userName} companyName={companyName} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationDropdown />

        {/* Avatar dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 rounded-full px-2 py-1.5"
            >
              <Avatar className="size-8">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={userName || "Avatar"} />
                )}
                <AvatarFallback className="bg-brand-100 text-xs font-medium text-brand-700">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
                {userName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userName || "Anvandare"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {companyName || roleLabels[role]}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={profileHref}
                className="flex cursor-pointer items-center"
              >
                <User className="mr-2 size-4" />
                Min profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/${role === "admin" ? "admin/settings" : `${role}/profile`}`}
                className="flex cursor-pointer items-center"
              >
                <Settings className="mr-2 size-4" />
                Installningar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              variant="destructive"
              className="cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
