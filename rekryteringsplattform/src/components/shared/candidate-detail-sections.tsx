import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasCandidateCompensationData } from "@/lib/candidate-form";

// Shared, read-only candidate detail body (Profile, Compensation, Employment,
// Languages, Screening). Extracted verbatim from the company candidate page so
// recruiters & Recruito see the exact same information the client sees, without
// duplicating ~200 lines of markup. Purely presentational — no stage-movement
// controls live here, which keeps recruiter/admin view-only by construction.
function formatNoticePeriod(value: string | null) {
    const map: Record<string, string> = {
        immediately: "Available Immediately",
        "2_weeks": "2 Weeks",
        "1_month": "1 Month",
        "2_months": "2 Months",
        "3_months": "3 Months",
    };
    return value ? (map[value] || value) : null;
}

function formatContactMethod(value: string | null) {
    const map: Record<string, string> = {
        in_person: "In Person",
        video_call: "Video Call",
        phone: "Phone",
        email: "Email",
        messaging: "Messaging",
    };
    return value ? (map[value] || value) : null;
}

function formatWorkAuthorization(value: string | null) {
    const map: Record<string, string> = {
        eu_citizen: "EU Citizen",
        permanent_resident: "Permanent Resident",
        valid_work_permit: "Valid Work Permit",
        requires_visa: "Requires Visa Sponsorship",
        not_authorized: "Not Authorized to Work",
    };
    return value ? (map[value] || value) : null;
}

function formatLocationStatus(value: string | null) {
    const map: Record<string, string> = {
        on_site: "Based in / near job location",
        willing_to_relocate: "Willing to relocate",
        fully_remote: "Position is fully remote",
    };
    return value ? (map[value] || value) : null;
}

export function CandidateDetailSections({
    candidate,
    dict,
}: {
    candidate: any;
    dict: any;
}) {
    const c = dict.company;

    const languageProficiency: Array<{ language: string; proficiency: string }> =
        Array.isArray(candidate.language_proficiency) ? candidate.language_proficiency : [];
    const screeningAnswers: Array<{ question: string; answer: string }> =
        Array.isArray(candidate.screening_answers) ? candidate.screening_answers : [];

    const hasCompensation = hasCandidateCompensationData(candidate);
    const hasScreeningAnswers = screeningAnswers.some((qa) => qa.answer && qa.answer.trim());
    const hasEmployment = !!(
        candidate.employment_status || candidate.other_processes !== null || candidate.employment_status_reason
    );

    const notProvided = <span className="text-muted-foreground italic">{dict.common.notSpecified}</span>;
    const notProvidedByRecruiter = (
        <p className="text-sm text-muted-foreground italic">{c.notProvidedByRecruiter}</p>
    );

    return (
        <>
            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle>{c.candidateProfileTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Location</p>
                            {(candidate.location_city || candidate.location_country) ? (
                                <p className="font-semibold">
                                    {[candidate.location_city, candidate.location_country].filter(Boolean).join(", ")}
                                </p>
                            ) : notProvidedByRecruiter}
                        </div>
                        {candidate.location_status && (
                            <div>
                                <p className="text-muted-foreground">Location Status</p>
                                <p className="font-semibold">{formatLocationStatus(candidate.location_status)}</p>
                            </div>
                        )}
                        {candidate.work_authorization && (
                            <div>
                                <p className="text-muted-foreground">Work Authorization</p>
                                <p className="font-semibold">{formatWorkAuthorization(candidate.work_authorization)}</p>
                            </div>
                        )}
                    </div>

                    {candidate.cover_note && (
                        <div>
                            <p className="font-medium mb-2">{c.motivationTitle}</p>
                            <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap italic">
                                &quot;{candidate.cover_note}&quot;
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Compensation & Availability */}
            <Card>
                <CardHeader>
                    <CardTitle>Compensation & Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {hasCompensation ? (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-muted-foreground">Current Salary</p>
                            <p className="font-semibold">
                                {candidate.current_salary ? (
                                    <>
                                        {candidate.current_salary_currency || ''} {candidate.current_salary?.toLocaleString()}
                                        <span className="text-muted-foreground font-normal"> / year</span>
                                    </>
                                ) : notProvided}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Expected Salary</p>
                            <p className="font-semibold">
                                {candidate.desired_salary ? (
                                    <>
                                        {candidate.desired_salary_currency || ''} {candidate.desired_salary?.toLocaleString()}
                                        <span className="text-muted-foreground font-normal"> / year</span>
                                    </>
                                ) : notProvided}
                            </p>
                            {candidate.expected_salary_below_current_reason && (
                                <p className="mt-1 text-xs text-muted-foreground italic">
                                    Reason expected is below current: {candidate.expected_salary_below_current_reason}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-muted-foreground">Notice Period</p>
                            <p className="font-semibold">
                                {candidate.notice_period ? (
                                    <>
                                        {formatNoticePeriod(candidate.notice_period)}
                                        {candidate.notice_negotiable && <span className="ml-2 text-xs text-emerald-600 font-medium">(Negotiable)</span>}
                                    </>
                                ) : notProvided}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Date of First Contact</p>
                            <p className="font-semibold">
                                {candidate.first_contact_date ? new Date(candidate.first_contact_date).toLocaleDateString() : notProvided}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Contact Method</p>
                            <p className="font-semibold">
                                {candidate.contact_method ? formatContactMethod(candidate.contact_method) : notProvided}
                            </p>
                        </div>
                    </div>
                    {candidate.current_benefits && (
                        <div>
                            <p className="text-muted-foreground mb-1">Current Benefits</p>
                            <p className="text-sm">{candidate.current_benefits}</p>
                        </div>
                    )}
                    {candidate.desired_benefits && (
                        <div>
                            <p className="text-muted-foreground mb-1">Desired Benefits</p>
                            <p className="text-sm">{candidate.desired_benefits}</p>
                        </div>
                    )}
                    </>
                    ) : notProvidedByRecruiter}
                </CardContent>
            </Card>

            {/* Employment Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Employment Status & Recruitment Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {hasEmployment ? (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-muted-foreground">Employment Status</p>
                            <p className="font-semibold capitalize">
                                {candidate.employment_status ? candidate.employment_status.replace('_', ' ') : notProvided}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">In Other Processes</p>
                            <p className="font-semibold">
                                {candidate.other_processes !== null
                                    ? (candidate.other_processes ? `Yes${candidate.other_processes_stage ? ` — ${candidate.other_processes_stage.replace('_', ' ')}` : ''}` : 'No')
                                    : notProvided}
                            </p>
                        </div>
                    </div>
                    {candidate.employment_status_reason && (
                        <div>
                            <p className="text-muted-foreground mb-1">Reason / Motivation</p>
                            <p className="text-sm">{candidate.employment_status_reason}</p>
                        </div>
                    )}
                    </>
                    ) : notProvidedByRecruiter}
                </CardContent>
            </Card>

            {/* Language Proficiency */}
            {languageProficiency.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Language Proficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {languageProficiency.map((l, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-medium">
                                    {l.language} <span className="text-muted-foreground capitalize">· {l.proficiency}</span>
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Screening Answers */}
            <Card>
                <CardHeader>
                    <CardTitle>Screening Answers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasScreeningAnswers ? (
                    screeningAnswers.map((qa, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-1">Q{i + 1} — {qa.question}</p>
                            <p className="text-sm text-slate-700">{qa.answer || <span className="italic text-slate-400">No answer provided</span>}</p>
                        </div>
                    ))
                    ) : notProvidedByRecruiter}
                </CardContent>
            </Card>
        </>
    );
}
