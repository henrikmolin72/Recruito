"use client";

import Link from "next/link";
import { Bell, Menu, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-muted rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-lg font-bold text-brand-600">Rekryto</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-muted rounded-lg">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger-500" />
        </button>

        <div className="relative group">
          <button className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg">
            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-medium text-brand-600">EL</span>
            </div>
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-border py-1 z-50">
            <Link href="#" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted">
              <User className="h-4 w-4" /> Min profil
            </Link>
            <Link href="#" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted">
              <Settings className="h-4 w-4" /> Inställningar
            </Link>
            <hr className="my-1 border-border" />
            <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-danger-500">
              <LogOut className="h-4 w-4" /> Logga ut
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
