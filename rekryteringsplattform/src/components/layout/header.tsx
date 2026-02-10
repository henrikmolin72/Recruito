"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

interface HeaderProps {
  role: "company" | "recruiter" | "admin";
  userName?: string;
  companyName?: string;
}

export function Header({ role, userName, companyName }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
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
        <Button variant="ghost" size="icon">
          <Bell className="size-5" />
        </Button>
      </div>
    </header>
  );
}
