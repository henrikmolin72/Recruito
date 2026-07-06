import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminJobById } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";

export default async function AdminJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getAdminJobById(id);
    if (!job) notFound();

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/jobs">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <StatusBadge status={job.status} />
            </div>

            <JobPreviewCard job={job} variant="company" />
        </div>
    );
}
