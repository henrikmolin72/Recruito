import { ReconfirmBanner } from "@/components/dashboard/company/reconfirm-banner";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ReconfirmBanner />
            {children}
        </>
    );
}
