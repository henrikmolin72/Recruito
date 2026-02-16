"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role access
  const currentSection = pathname.split("/")[1];
  if (currentSection && currentSection !== user.role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Åtkomst nekad</h1>
          <p className="text-muted-foreground">
            Du har inte behörighet att se denna sida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={user.role} />
      <MobileNav
        role={user.role}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={user.full_name}
          userRole={user.role}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
