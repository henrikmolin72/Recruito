import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function AuthLayout({
  children,
}: {
      children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="fixed right-3 top-3 z-50 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <LanguageSwitcher variant="dropdown" compact />
      </div>
      {children}
    </div>
  );
}
