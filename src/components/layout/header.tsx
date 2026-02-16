"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Menu, LogOut, User, ChevronDown } from "lucide-react";

interface HeaderProps {
  userName?: string;
  userRole?: string;
  onMenuToggle?: () => void;
}

export function Header({ userName, userRole, onMenuToggle }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabels: Record<string, string> = {
    company: "Företag",
    recruiter: "Rekryterare",
    admin: "Admin",
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-muted-foreground hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href="/"
          className="text-xl font-bold text-brand-600 lg:hidden"
        >
          Rekryto
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-md p-2 text-muted-foreground hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium">{userName || "Användare"}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabels[userRole || ""] || userRole}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-white py-1 shadow-lg">
              <div className="border-b px-4 py-2">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[userRole || ""] || userRole}
                </p>
              </div>
              <Link
                href={`/${userRole}/profile`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-gray-100"
              >
                <User className="h-4 w-4" />
                Min profil
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-500 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                Logga ut
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
