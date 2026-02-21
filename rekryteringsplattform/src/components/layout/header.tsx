"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { QuickActions } from "@/components/layout/quick-actions";
import { NAV_MAP } from "@/components/layout/sidebar";
import { AppLogo } from "@/components/shared/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";

export function Header({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [initials, setInitials] = useState("U");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isRecruiter = role === "recruiter";
  const navItems = NAV_MAP[role] || NAV_MAP.company;

  useEffect(() => {
    import("@/lib/actions/user").then(({ getSidebarData }) => {
      getSidebarData().then(data => {
        if (data) setInitials(data.initials);
      });
    });
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={cn(
        "h-16 border-b flex items-center justify-between px-4 sm:px-6 transition-all duration-300 z-40",
        isRecruiter ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-border text-foreground"
      )}>
        <div className="flex items-center gap-3">
          {/* Hamburger - visible below lg */}
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-black/5 active:scale-95 transition-all"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label={t("common.openMenu")}
          >
            <Menu className={cn("h-5 w-5", isRecruiter ? "text-slate-300" : "text-slate-600")} />
          </button>

          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            isRecruiter
              ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
              : "bg-blue-50 border-blue-100 text-blue-600"
          )}>
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isRecruiter ? "bg-brand-400" : "bg-blue-500")} />
            {isRecruiter ? t("nav.professional") : t("nav.corporate")}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <QuickActions role={role} />
          <NotificationsDropdown />
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-white/10 rounded-full transition-all focus:outline-none"
            >
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border shadow-sm",
                isRecruiter
                  ? "bg-slate-800 border-slate-700 text-brand-400"
                  : "bg-brand-50 border-brand-100 text-brand-600"
              )}>
                {initials}
              </div>
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-border/50 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900">
                  <div className="px-4 py-2 border-b border-border/10 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("common.account")}</p>
                  </div>
                  <Link
                    href={`/${role}/profile`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors group/item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-slate-400 group-hover/item:text-brand-600" />
                    <span className="font-medium text-slate-700 group-hover/item:text-slate-900">{t("common.myProfile")}</span>
                  </Link>
                  <Link
                    href={`/${role}/profile`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors group/item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-slate-400 group-hover/item:text-brand-600" />
                    <span className="font-medium text-slate-700 group-hover/item:text-slate-900">{t("common.settings")}</span>
                  </Link>
                  <div className="my-1 border-t border-border/10" />
                  <LanguageSwitcher />
                  <div className="my-1 border-t border-border/10" />
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-all hover:bg-danger-50 group/logout"
                    >
                      <LogOut className="h-4 w-4 text-danger-500 group-hover/logout:scale-110 transition-transform" />
                      <span className="font-bold text-danger-600">{t("common.logOut")}</span>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer */}
          <nav className={cn(
            "absolute inset-y-0 left-0 w-72 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200",
            isRecruiter ? "bg-slate-900 text-white" : "bg-white text-foreground"
          )}>
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-border/10">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileNavOpen(false)}>
                <AppLogo
                  size="sm"
                  textClassName={isRecruiter ? "text-white" : "text-brand-600"}
                />
              </Link>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isRecruiter ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                )}
                aria-label={t("common.closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                      isActive
                        ? (isRecruiter ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" : "bg-brand-50 text-brand-600")
                        : (isRecruiter ? "text-slate-400 hover:bg-slate-800/50 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5",
                      isActive ? "" : (isRecruiter ? "text-slate-500" : "text-muted-foreground")
                    )} />
                    {t(item.labelKey)}
                    {item.badge && (
                      <span className={cn(
                        "ml-auto text-xs rounded-full px-2 py-0.5 font-bold",
                        isRecruiter ? "bg-white/10 text-brand-400" : "bg-brand-100 text-brand-600"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Drawer footer */}
            <div className={cn(
              "p-4 border-t",
              isRecruiter ? "border-slate-800" : "border-border"
            )}>
              <LanguageSwitcher />
              <form action={logout} className="mt-2">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-danger-50 text-danger-600"
                >
                  <LogOut className="h-5 w-5" />
                  {t("common.logOut")}
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
