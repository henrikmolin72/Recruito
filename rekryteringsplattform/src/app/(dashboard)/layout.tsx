"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Determine role from path
  let role = "company";
  if (pathname.startsWith("/recruiter")) role = "recruiter";
  if (pathname.startsWith("/admin")) role = "admin";

  return (
    <div className="flex h-screen">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header role={role} />
        <main className={`flex-1 overflow-y-auto p-6 transition-colors duration-300 ${role === "admin" ? "bg-emerald-50" : "bg-muted"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
