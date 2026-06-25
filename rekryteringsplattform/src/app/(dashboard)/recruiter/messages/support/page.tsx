import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRecruiterSupportMessages, sendRecruiterSupportMessage } from "@/lib/actions/messages";
import { CandidateChat } from "@/components/shared/candidate-chat";

// Candidate-independent recruiter -> Recruito (support) chat. Available from day
// one — no candidate or mandate required (migration 061).
export default async function RecruiterSupportPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const messages = (await getRecruiterSupportMessages()) ?? [];

    return (
        <div className="max-w-3xl space-y-4">
            <Link
                href="/recruiter/messages"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
                <ArrowLeft className="h-4 w-4" /> Tillbaka till meddelanden
            </Link>
            <div>
                <h1 className="text-2xl font-bold">Kontakta Recruito</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Din direkta supportkanal till Recruito. Skriv när du vill — även innan du tagit ett uppdrag.
                </p>
            </div>
            {/* Leading candidateId/jobId are unused — the thread is the caller's own. */}
            <CandidateChat
                candidateId=""
                jobId=""
                initialMessages={messages}
                currentUserId={user?.id || ""}
                conversationType="recruito_recruiter_general"
                sendMessageFn={sendRecruiterSupportMessage}
                pollFn={getRecruiterSupportMessages}
            />
        </div>
    );
}
