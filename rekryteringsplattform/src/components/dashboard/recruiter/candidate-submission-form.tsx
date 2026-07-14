"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    Plus,
    Trash2,
    ShieldCheck,
    User,
    Briefcase,
    DollarSign,
    MessageSquare,
    ClipboardList,
    Upload,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCandidateExtended, saveDraftCandidate, deleteDraftCandidate, screenDraftCandidate } from "@/lib/actions/candidates-extended";
import { getMissingRequiredFields } from "@/lib/candidate-form";
import { EUROPEAN_LANGUAGE_OPTIONS } from "@/lib/job-form-options";
import { toast } from "sonner";

// Small red asterisk marking a field the recruiter must complete before presenting.
const Req = () => <span className="text-red-500"> *</span>;

type Dict = Record<string, string>;

interface Props {
    mandateId: string;
    jobTitle: string;
    companyName: string;
    screeningQuestions?: string[];
    dict: Dict;
    initialDraftId?: string | null;
    initialDraft?: Record<string, any> | null;
}

const CURRENCIES = ["EUR", "SEK", "NOK", "DKK", "GBP", "USD", "CHF", "PLN"];

const SectionHeader = ({
    icon: Icon,
    title,
    number,
}: {
    icon: React.ElementType;
    title: string;
    number: number;
}) => (
    <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-brand-600" />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Section {number}
            </p>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
    </div>
);

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {children}
    </label>
);

const FieldRow = ({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) => (
    <div className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : ""} gap-4`}>{children}</div>
);

export function CandidateSubmissionForm({
    mandateId,
    jobTitle,
    companyName,
    screeningQuestions = [],
    dict: r,
    initialDraftId = null,
    initialDraft = null,
}: Props) {
    const router = useRouter();

    const draft = initialDraft;
    // Coerce a draft column to a string for uncontrolled-input defaultValues.
    const ds = (key: string) => {
        const v = draft?.[key];
        return v === null || v === undefined ? "" : String(v);
    };

    // --- Email (shared between Verify tool and Personal Details) ---
    const [email, setEmail] = useState(ds("email"));
    const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "ok" | "blocked">("idle");

    // --- Section 2: location status & work auth ---
    const [locationStatus, setLocationStatus] = useState(ds("location_status"));
    const [workAuth, setWorkAuth] = useState(ds("work_authorization"));

    // --- Section 3: employment ---
    const [employmentStatus, setEmploymentStatus] = useState(ds("employment_status"));
    const [otherProcesses, setOtherProcesses] = useState(draft?.other_processes ? "yes" : "");
    const [otherProcessesStage, setOtherProcessesStage] = useState(ds("other_processes_stage"));

    // --- Section 4: notice negotiable ---
    const [noticeNegotiable, setNoticeNegotiable] = useState(draft?.notice_negotiable ? "yes" : "");
    // Tracked only to hide the negotiable question for immediately-available
    // candidates (client request 2026-07-10); the radio itself stays uncontrolled.
    const [noticePeriod, setNoticePeriod] = useState(ds("notice_period"));

    // --- Section 4: compensation (linked currency + below-current reason) ---
    const [currentCurrency, setCurrentCurrency] = useState(draft?.current_salary_currency || "EUR");
    const [expectedCurrency, setExpectedCurrency] = useState(draft?.desired_salary_currency || "EUR");
    const [currentSalary, setCurrentSalary] = useState(ds("current_salary"));
    const [expectedSalary, setExpectedSalary] = useState(
        draft?.desired_salary != null ? String(draft.desired_salary) : ""
    );
    const expectedBelowCurrent =
        !!currentSalary &&
        !!expectedSalary &&
        Number(expectedSalary) < Number(currentSalary);

    // --- Section 5: contact method, languages ---
    const [contactMethod, setContactMethod] = useState(ds("contact_method"));
    const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>(
        Array.isArray(draft?.language_proficiency) && draft.language_proficiency.length > 0
            ? draft.language_proficiency
            : [{ language: "", proficiency: "" }]
    );

    // --- Screening ---
    const [screeningAnswers, setScreeningAnswers] = useState<string[]>(
        screeningQuestions.map((q, i) => {
            const arr = Array.isArray(draft?.screening_answers) ? draft.screening_answers : [];
            const match = arr.find((a: any) => a?.question === q);
            return String(match?.answer ?? arr[i]?.answer ?? "");
        })
    );

    // --- CV ---
    const [cvFile, setCvFile] = useState<File | null>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // --- In-form AI screening (pre-submission self-check: Score + a few gaps) ---
    const [screening, setScreening] = useState(false);
    const [screenResult, setScreenResult] = useState<{ matchScore: number | null; criticalGaps: string[] } | null>(null);
    const [screenError, setScreenError] = useState<string | null>(null);
    // Identifies the CV file the last screening ran against (name+size), so the
    // auto-run effect fires once per new CV and never loops (rate limit is 15/10min).
    const [screenedMarker, setScreenedMarker] = useState<string | null>(null);

    // --- Declaration ---
    const [declared, setDeclared] = useState(false);

    // --- Submit ---
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // --- Draft ---
    const DRAFT_KEY = `candidate_draft_${mandateId}`;

    const TEXT_DRAFT_KEYS = ["first_name","last_name","email","phone","location_city","location_country",
        "linkedin_url","portfolio_url","current_title","current_company",
        "years_experience","current_salary","expected_salary","cover_note",
        "notice_period","first_contact_date"];
    const [draftTextFields, setDraftTextFields] = useState<Record<string, string>>(() => {
        if (!draft) return {};
        const map: Record<string, string> = {};
        const cols = [
            "first_name", "last_name", "email", "phone", "location_city", "location_country",
            "linkedin_url", "portfolio_url", "cover_note", "notice_period", "first_contact_date",
            "current_benefits", "desired_benefits", "expected_salary_below_current_reason",
        ];
        for (const k of cols) {
            const v = draft[k];
            if (v !== null && v !== undefined) map[k] = String(v);
        }
        // The "Reason / motivation" input is named employment_reason but stored in
        // the employment_status_reason column.
        if (draft.employment_status_reason != null) {
            map["employment_reason"] = String(draft.employment_status_reason);
        }
        return map;
    });
    const [draftId, setDraftId] = useState<string | null>(initialDraftId);

    useEffect(() => {
        // When resuming a server-side draft, its values are passed in via props;
        // don't let a stale localStorage draft override them.
        if (initialDraftId) return;
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const d = JSON.parse(saved);
                /* eslint-disable react-hooks/set-state-in-effect --
                   One-shot client-only hydration of a localStorage draft on mount
                   (guarded by initialDraftId + deps [DRAFT_KEY]). localStorage is
                   unavailable during SSR, so a lazy useState initializer isn't viable
                   across these atoms; React batches these updates into one render. */
                if (d.languages) setLanguages(d.languages);
                if (d.locationStatus) setLocationStatus(d.locationStatus);
                if (d.workAuth) setWorkAuth(d.workAuth);
                if (d.employmentStatus) setEmploymentStatus(d.employmentStatus);
                if (d.otherProcesses) setOtherProcesses(d.otherProcesses);
                if (d.otherProcessesStage) setOtherProcessesStage(d.otherProcessesStage);
                if (d.noticeNegotiable) setNoticeNegotiable(d.noticeNegotiable);
                if (d.contactMethod) setContactMethod(d.contactMethod);
                if (d.screeningAnswers) setScreeningAnswers(d.screeningAnswers);
                const restoredText: Record<string, string> = {};
                for (const key of TEXT_DRAFT_KEYS) {
                    if (d[key]) restoredText[key] = d[key];
                }
                if (Object.keys(restoredText).length > 0) setDraftTextFields(restoredText);
                if (d.email) { setEmail(d.email); setVerifyStatus("ok"); }
                /* eslint-enable react-hooks/set-state-in-effect */
            }
        } catch { }
    }, [DRAFT_KEY]);

    async function handleVerify() {
        if (!email.trim()) return;
        setVerifyStatus("checking");
        try {
            const fd = new FormData();
            fd.append("mandate_id", mandateId);
            fd.append("email", email.trim());
            const res = await fetch("/api/candidates/check-duplicate", { method: "POST", body: fd });
            if (res.ok) {
                const { duplicate } = await res.json();
                setVerifyStatus(duplicate ? "blocked" : "ok");
            } else {
                setVerifyStatus("ok"); // fail-open so UI isn't stuck; server will still block
            }
        } catch {
            setVerifyStatus("ok");
        }
    }

    function addLanguage() {
        setLanguages([...languages, { language: "", proficiency: "" }]);
    }

    function removeLanguage(i: number) {
        setLanguages(languages.filter((_, idx) => idx !== i));
    }

    function updateLanguage(i: number, field: "language" | "proficiency", value: string) {
        const updated = [...languages];
        updated[i][field] = value;
        setLanguages(updated);
    }

    // Fold the React-controlled state (toggles, selects, screening, languages)
    // into the FormData. Used by BOTH submit and draft-save so a saved draft
    // carries the same fields a direct present would — fixes the draft data-loss.
    function injectDynamicFields(fd: FormData) {
        fd.set("location_status", locationStatus);
        fd.set("work_authorization", workAuth);
        fd.set("employment_status", employmentStatus);
        fd.set("other_processes", otherProcesses);
        fd.set("other_processes_stage", otherProcessesStage);
        // Immediately available → no notice period, so "negotiable" is moot.
        fd.set("notice_negotiable", noticePeriod === "immediately" ? "" : noticeNegotiable);
        fd.set("contact_method", contactMethod);
        fd.set("language_proficiency", JSON.stringify(languages.filter((l) => l.language)));
        fd.set(
            "screening_answers",
            JSON.stringify(
                screeningQuestions.map((q, i) => ({ question: q, answer: screeningAnswers[i] || "" }))
            )
        );
    }

    async function handleSaveDraft(e: React.MouseEvent) {
        e.preventDefault();
        const form = (e.currentTarget as HTMLElement).closest("form") as HTMLFormElement;
        const fd = new FormData(form);
        injectDynamicFields(fd);
        try {
            const result = await saveDraftCandidate(mandateId, fd, draftId);
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            if (result?.draftId) setDraftId(result.draftId);
            // The server is now the source of truth; clear any stale local copy.
            try { localStorage.removeItem(DRAFT_KEY); } catch { }
            toast.success("Utkast sparat. Du hittar det under kolumnen Draft.");
        } catch {
            toast.error("Could not save draft");
        }
    }

    const screenErrors: Record<string, string> = {
        no_cv: r.aiScreenErrNoCv || "Upload a CV first to run AI screening.",
        unsupported_cv_format:
            r.aiScreenErrUnsupportedCv ||
            "AI screening supports PDF or TXT CVs only. Upload one of those to get a score.",
        rate_limited: r.aiScreenErrRateLimited || "Too many screenings — wait a few minutes and try again.",
        ai_unavailable:
            r.aiScreenErrUnavailable ||
            "AI screening is temporarily unavailable. Your draft is saved — try again later.",
    };

    // Persist the in-progress candidate as a draft (incl. CV), run the AI
    // self-check, and show Score + a few critical gaps — before presenting.
    // Called both by the auto-run effect (on CV upload) and the manual Re-run button.
    async function runScreening() {
        if (!cvFile || !formRef.current) { setScreenError(screenErrors.no_cv); return; }
        // Mark this CV as screened up front so the effect doesn't re-fire while the
        // request is in flight (or on a failure that would leave the marker stale).
        setScreenedMarker(`${cvFile.name}:${cvFile.size}`);
        setScreening(true);
        setScreenError(null);
        const fd = new FormData(formRef.current);
        injectDynamicFields(fd);
        fd.set("cv_file", cvFile);
        try {
            const result = await screenDraftCandidate(mandateId, fd, draftId);
            if ("error" in result) {
                setScreenError(screenErrors[result.error] || r.aiScreenErrFailed || "Screening failed. Please try again.");
                return;
            }
            // Keep editing the same draft row on subsequent runs / save / submit.
            if (result.draftId) setDraftId(result.draftId);
            setScreenResult({ matchScore: result.matchScore, criticalGaps: result.criticalGaps });
        } catch {
            setScreenError(r.aiScreenErrFailed || "Screening failed. Please try again.");
        } finally {
            setScreening(false);
        }
    }

    // Auto-run the AI screening once whenever a new CV is uploaded — the check is
    // always shown, no longer behind an optional button click. The screenedMarker
    // guard makes this fire once per file (the manual button re-runs on demand).
    useEffect(() => {
        if (!cvFile || screening) return;
        const marker = `${cvFile.name}:${cvFile.size}`;
        if (marker === screenedMarker) return;
        runScreening();
        // Keyed on cvFile + screening; runScreening reads the latest state via
        // closure and is guarded by screenedMarker so it runs exactly once per
        // uploaded CV. `screening` is included so a CV uploaded while a previous
        // run is still in flight gets screened once that run settles.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cvFile, screening]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!declared) {
            setFormError(r.declarationRequired || "You must confirm the declaration to submit.");
            return;
        }
        setFormError(null);
        setSubmitting(true);

        const form = e.currentTarget;
        const fd = new FormData(form);
        injectDynamicFields(fd);
        if (cvFile) fd.set("cv_file", cvFile);

        // Required fields (mirrors the server) — a candidate can't be presented
        // with empty compensation / employment / notice / contact / screening,
        // so the company never sees rows of "Not specified".
        if (getMissingRequiredFields(fd, screeningQuestions.length).length > 0) {
            setFormError(
                r.completeRequiredFields ||
                "Please complete all required fields marked with * before presenting the candidate."
            );
            setSubmitting(false);
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        try {
            const result = await createCandidateExtended(mandateId, fd);
            if (result?.error) {
                setFormError(result.error);
                setSubmitting(false);
            } else {
                localStorage.removeItem(DRAFT_KEY);
                // Submitting a resumed draft promotes it: remove the draft row.
                if (draftId) { try { await deleteDraftCandidate(draftId); } catch { } }
                setDraftTextFields({});
                router.push("/recruiter/mandates");
            }
        } catch {
            setFormError("An unexpected error occurred. Please try again.");
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header Bar */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Image
                            src="/recruito-logo.png"
                            alt="Recruito"
                            width={120}
                            height={32}
                            className="h-8 w-auto object-contain"
                        />
                        <div className="h-5 w-px bg-slate-200" />
                        <div>
                            <p className="text-xs font-semibold text-slate-500">{jobTitle}</p>
                            <p className="text-[11px] text-slate-400">{companyName}</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
                        {r.candidatePresentation || "Candidate Presentation"}
                    </span>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* ─────────────────── SECTION 1 – VERIFICATION ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={ShieldCheck} title={r.sec1Title || "Candidate Verification"} number={1} />

                    <div className="space-y-4">
                        <div>
                            <Label>{r.emailLabel || "Candidate Email Address"}</Label>
                            <div className="flex gap-3">
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setVerifyStatus("idle"); }}
                                    placeholder={r.emailPlaceholder || "Enter Email"}
                                    className="h-11 flex-1 bg-slate-50 border-slate-200"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleVerify}
                                    disabled={verifyStatus === "checking" || !email}
                                    className="h-11 px-6 shrink-0"
                                >
                                    {verifyStatus === "checking" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        r.verifyButton || "Verify Candidate"
                                    )}
                                </Button>
                            </div>
                            {verifyStatus === "ok" && (
                                <p className="mt-2 text-sm text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    {r.verifyNotFound || "Candidate not registered. You may proceed."}
                                </p>
                            )}
                            {verifyStatus === "blocked" && (
                                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    {r.verifyAlreadyExists || "Candidate already registered. Submission blocked."}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─────────────────── SECTION 2 – PERSONAL DETAILS ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={User} title={r.sec2Title || "Personal Details"} number={2} />

                    <div className="space-y-5">
                        <FieldRow>
                            <div>
                                <Label>{r.firstNameLabel || "First Name *"}</Label>
                                <Input name="first_name" required placeholder="Anna" defaultValue={draftTextFields["first_name"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                            <div>
                                <Label>{r.lastNameLabel || "Last Name *"}</Label>
                                <Input name="last_name" required placeholder="Smith" defaultValue={draftTextFields["last_name"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                        </FieldRow>

                        <FieldRow>
                            <div>
                                <Label>{r.emailLabel || "Email Address *"}</Label>
                                <Input
                                    type="email"
                                    name="email"
                                    required
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setVerifyStatus("idle"); }}
                                    placeholder="anna@example.com"
                                    className="h-11 bg-slate-50 border-slate-200"
                                />
                            </div>
                            <div>
                                <Label>{r.phoneLabelOptional || "Mobile Number (incl. country code)"}</Label>
                                <Input type="tel" name="phone" placeholder="+46 70 000 00 00" defaultValue={draftTextFields["phone"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                        </FieldRow>

                        <FieldRow>
                            <div>
                                <Label>{r.locationCityLabel || "City"}</Label>
                                <Input name="location_city" placeholder="Stockholm" defaultValue={draftTextFields["location_city"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                            <div>
                                <Label>{r.locationCountryLabel || "Country"}</Label>
                                <Input name="location_country" placeholder="Sweden" defaultValue={draftTextFields["location_country"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                        </FieldRow>

                        <div>
                            <Label>{r.locationStatusLabel || "Candidate Location Status"}</Label>
                            <div className="flex flex-wrap gap-3 mt-1">
                                {[
                                    { value: "on_site", label: r.locationOnSite || "Based in / near job location" },
                                    { value: "willing_to_relocate", label: r.locationRelocate || "Willing to relocate" },
                                    { value: "fully_remote", label: r.locationRemote || "Position is fully remote" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setLocationStatus(opt.value)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${locationStatus === opt.value
                                                ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                            }`}
                                    >
                                        <div className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${locationStatus === opt.value ? "border-white bg-white/30" : "border-slate-400"}`}>
                                            {locationStatus === opt.value && <div className="h-1.5 w-1.5 bg-white rounded-sm" />}
                                        </div>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <FieldRow>
                            <div>
                                <Label>{r.linkedinProfileUrl || "LinkedIn Profile URL"}</Label>
                                <Input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/..." defaultValue={draftTextFields["linkedin_url"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                            <div>
                                <Label>{r.portfolioLabel || "Portfolio / GitHub (optional)"}</Label>
                                <Input type="url" name="portfolio_url" placeholder={r.portfolioPlaceholder || "https://github.com/..."} defaultValue={draftTextFields["portfolio_url"] || ""} className="h-11 bg-slate-50 border-slate-200" />
                            </div>
                        </FieldRow>

                        {/* Work Authorization */}
                        <div>
                            <Label>{r.workAuthLabel || "Work Authorization Status"}</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                {[
                                    { value: "eu_citizen", label: r.workAuthEU || "EU Citizen" },
                                    { value: "permanent_resident", label: r.workAuthPR || "Permanent Resident" },
                                    { value: "valid_work_permit", label: r.workAuthPermit || "Valid Work Permit" },
                                    { value: "requires_visa", label: r.workAuthVisa || "Requires Visa Sponsorship" },
                                    { value: "not_authorized", label: r.workAuthNone || "Not Authorized to Work" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setWorkAuth(opt.value)}
                                        className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${workAuth === opt.value
                                                ? "bg-brand-600 text-white border-brand-600"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CV Upload */}
                        <div>
                            <Label>{r.cvLabel || "Upload CV (PDF or DOC, max 5MB)"}</Label>
                            <div
                                onClick={() => cvInputRef.current?.click()}
                                className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${cvFile ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-brand-300"
                                    }`}
                            >
                                <input
                                    ref={cvInputRef}
                                    type="file"
                                    name="cv_file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    // A programmatic .click() bubbles up to the dropzone div,
                                    // whose onClick would open a second file dialog on top of
                                    // the first — swallow the input's own click here.
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={async (e) => {
                                        const input = e.currentTarget;
                                        const f = input.files?.[0];
                                        // Clear the native value so picking a file again — even the
                                        // same one — always re-fires onChange (fixes re-upload).
                                        input.value = "";
                                        if (!f || f.size > 5 * 1024 * 1024) return;
                                        setCvFile(f);
                                    }}
                                />
                                {cvFile ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center justify-center gap-2 text-emerald-700 flex-1">
                                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                                            <span className="text-sm font-semibold truncate">{cvFile.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                // Don't bubble to the dropzone div — its onClick
                                                // would queue a second file dialog on top of the
                                                // one opened below.
                                                e.stopPropagation();
                                                setCvFile(null);
                                                // Deleting the CV invalidates its screening: clear
                                                // the note and the marker so the next upload (even
                                                // the same file) auto-screens fresh.
                                                setScreenResult(null);
                                                setScreenedMarker(null);
                                                setScreenError(null);
                                                cvInputRef.current?.click();
                                            }}
                                            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Upload className="h-8 w-8" />
                                        <p className="text-sm font-medium">{r.cvUploadHint || "Drag and drop or click to browse"}</p>
                                        <p className="text-xs">{r.cvUploadLabel || "PDF or DOC, max 5MB"}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* In-form AI screening — pre-submission self-check (Score + critical gaps) */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{r.aiScreenTitle || "AI screening"}</p>
                                    <p className="text-xs text-slate-500">{r.aiScreenHint || "Check the candidate's fit before presenting."}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => runScreening()}
                                    // Disabled once a result exists: re-runs would return a different
                                    // score for the same CV (non-determinism reads as low quality).
                                    // Stays enabled after an error (screenResult null) so retry works.
                                    disabled={screening || !cvFile || screenResult !== null}
                                    className="h-10 px-4 gap-2 shrink-0"
                                >
                                    {screening ? <Loader2 className="h-4 w-4 animate-spin" /> : screenResult ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                    {screening ? (r.aiScreenRunning || "Screening…") : screenResult ? (r.aiScreenDone || "Screening complete") : (r.aiScreenRun || "Run AI screening")}
                                </Button>
                            </div>

                            {screening && (
                                <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700">
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    <span>{r.aiScreenProcessing || "Generating report — this can take up to a minute. Please stand by."}</span>
                                </div>
                            )}

                            {screenError && <p className="mt-2 text-xs font-medium text-red-600">{screenError}</p>}

                            {screenResult && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    {screenResult.matchScore !== null ? (
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-3xl font-black tabular-nums ${screenResult.matchScore >= 80 ? "text-emerald-600" : screenResult.matchScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                                {screenResult.matchScore}%
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{r.aiScreenScore || "AI Match Score"}</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">{r.aiScreenNoScore || "Screening ran, but no score could be extracted."}</p>
                                    )}
                                    {screenResult.criticalGaps.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{r.aiScreenGaps || "Gaps"}</p>
                                            <ul className="mt-1 space-y-1">
                                                {screenResult.criticalGaps.map((g, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                                                        <span>{g}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <p className="mt-2 text-[11px] text-slate-400">{r.aiScreenDisclaimer || "Decision support only — not an automated decision."}</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* ─────────────────── SECTION 3 – EMPLOYMENT STATUS ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={Briefcase} title={r.sec3Title || "Employment Status & Recruitment Activity"} number={3} />

                    <div className="space-y-5">
                        <div>
                            <Label>Current Employment Status<Req /></Label>
                            <div className="flex gap-3 mt-1">
                                {[
                                    { value: "employed", label: r.employedLabel || "Employed" },
                                    { value: "not_employed", label: r.notEmployedLabel || "Not Employed" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setEmploymentStatus(opt.value)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${employmentStatus === opt.value
                                                ? "bg-brand-600 text-white border-brand-600"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {employmentStatus === "not_employed" && (
                            <div>
                                <Label>{r.reasonLeavingLabel || "Reason for leaving last position"}<Req /></Label>
                                <Input
                                    name="employment_reason"
                                    placeholder={r.reasonLeavingPlaceholder || "End of contract, resignation, etc."}
                                    defaultValue={draftTextFields["employment_reason"] || ""}
                                    className="h-11 bg-slate-50 border-slate-200"
                                />
                            </div>
                        )}

                        {employmentStatus === "employed" && (
                            <div>
                                <Label>{r.motivationLabel || "Primary motivation for job change"}<Req /></Label>
                                <Input
                                    name="employment_reason"
                                    placeholder={r.motivationPlaceholder || "Career growth, salary, relocation..."}
                                    defaultValue={draftTextFields["employment_reason"] || ""}
                                    className="h-11 bg-slate-50 border-slate-200"
                                />
                            </div>
                        )}

                        <div>
                            <Label>{r.otherProcessesLabel || "Is the candidate involved in other recruitment processes?"}</Label>
                            <div className="flex gap-3 mt-1">
                                {[
                                    { value: "yes", label: r.otherProcessesYes || "Yes" },
                                    { value: "no", label: r.otherProcessesNo || "No" },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => { setOtherProcesses(opt.value); if (opt.value === "no") setOtherProcessesStage(""); }}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${otherProcesses === opt.value
                                                ? "bg-brand-600 text-white border-brand-600"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {otherProcesses === "yes" && (
                            <div>
                                <Label>{r.otherProcessesStageLabel || "Stage of Other Processes"}</Label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {[
                                        { value: "initial_screening", label: r.stageInitial || "Initial Screening" },
                                        { value: "interview", label: r.stageInterview || "Interview Stage" },
                                        { value: "final_interview", label: r.stageFinal || "Final Interview Stage" },
                                        { value: "offer_received", label: r.stageOffer || "Offer Received" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setOtherProcessesStage(opt.value)}
                                            className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-all ${otherProcessesStage === opt.value
                                                    ? "bg-brand-600 text-white border-brand-600"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─────────────────── SECTION 4 – COMPENSATION & AVAILABILITY ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={DollarSign} title={r.sec4Title || "Compensation & Availability"} number={4} />

                    <div className="space-y-6">
                        {/* Current Compensation */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-3">{r.currentCompLabel || "Current Compensation"}</p>
                            <FieldRow>
                                <div>
                                    <Label>{r.currencyLabel || "Currency"}</Label>
                                    <select
                                        name="current_salary_currency"
                                        value={currentCurrency}
                                        onChange={(e) => {
                                            setCurrentCurrency(e.target.value);
                                            setExpectedCurrency(e.target.value);
                                        }}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>{r.currentSalaryLabel || "Annual Gross Salary"}<Req /></Label>
                                    <Input
                                        type="number"
                                        name="current_salary"
                                        placeholder="75000"
                                        value={currentSalary}
                                        onChange={(e) => setCurrentSalary(e.target.value)}
                                        className="h-11 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </FieldRow>
                            <div className="mt-3">
                                <Label>{r.currentBenefitsLabel || "Current Benefits"}</Label>
                                <Textarea name="current_benefits" rows={2} placeholder={r.currentBenefitsPlaceholder || "Describe current benefits..."} defaultValue={draftTextFields["current_benefits"] || ""} className="bg-slate-50 border-slate-200 rounded-xl resize-none" />
                            </div>
                        </div>

                        {/* Expected Compensation */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-3">{r.desiredCompLabel || "Expected Compensation"}</p>
                            <FieldRow>
                                <div>
                                    <Label>{r.currencyLabel || "Currency"}</Label>
                                    <select
                                        name="desired_salary_currency"
                                        value={expectedCurrency}
                                        onChange={(e) => setExpectedCurrency(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>{r.desiredSalaryLabel || "Desired Annual Salary"}<Req /></Label>
                                    <Input
                                        type="number"
                                        name="expected_salary"
                                        placeholder="90000"
                                        value={expectedSalary}
                                        onChange={(e) => setExpectedSalary(e.target.value)}
                                        className="h-11 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </FieldRow>
                            {expectedBelowCurrent && (
                                <div className="mt-3">
                                    <Label>
                                        {r.expectedBelowCurrentLabel ||
                                            "Just to ensure we have accurate details, could you please explain why the expected salary is set below the current salary?"}
                                    </Label>
                                    <Textarea
                                        name="expected_salary_below_current_reason"
                                        rows={3}
                                        placeholder={r.expectedBelowCurrentPlaceholder || "Explain the reason..."}
                                        defaultValue={draftTextFields["expected_salary_below_current_reason"] || ""}
                                        className="bg-slate-50 border-slate-200 rounded-xl resize-none"
                                    />
                                </div>
                            )}
                            <div className="mt-3">
                                <Label>{r.desiredBenefitsLabel || "Desired Benefits"}</Label>
                                <Textarea name="desired_benefits" rows={2} placeholder={r.desiredBenefitsPlaceholder || "Describe desired benefits..."} defaultValue={draftTextFields["desired_benefits"] || ""} className="bg-slate-50 border-slate-200 rounded-xl resize-none" />
                            </div>
                        </div>

                        {/* Availability */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-3">{r.availabilityLabel || "Availability"}</p>
                            <div>
                                <Label>{r.noticePeriodLabel || "Notice Period"}<Req /></Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {[
                                        { value: "immediately", label: r.noticeImmediate || "Immediately Available" },
                                        { value: "2_weeks", label: r.notice2Weeks || "2 Weeks" },
                                        { value: "1_month", label: r.notice1Month || "1 Month" },
                                        { value: "2_months", label: r.notice2Months || "2 Months" },
                                        { value: "3_months", label: r.notice3Months || "3 Months" },
                                    ].map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="notice_period" value={opt.value} defaultChecked={draftTextFields["notice_period"] === opt.value} onChange={() => setNoticePeriod(opt.value)} className="accent-brand-600 h-4 w-4" />
                                            <span className="text-sm text-slate-700">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {noticePeriod !== "immediately" && (
                            <div className="mt-4">
                                <Label>{r.noticeNegotiableLabel || "Is notice period negotiable?"}</Label>
                                <div className="flex gap-3 mt-1">
                                    {[
                                        { value: "yes", label: r.noticeNegotiableYes || "Yes" },
                                        { value: "no", label: r.noticeNegotiableNo || "No" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setNoticeNegotiable(opt.value)}
                                            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${noticeNegotiable === opt.value
                                                    ? "bg-brand-600 text-white border-brand-600"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─────────────────── SECTION 5 – SCREENING & INTERVIEW NOTES ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={MessageSquare} title={r.sec5Title || "Screening & Interview Notes"} number={5} />

                    <div className="space-y-5">
                        <FieldRow>
                            <div>
                                <Label>{r.firstContactLabel || "Date of First Contact"}<Req /></Label>
                                <Input type="date" name="first_contact_date" defaultValue={draftTextFields["first_contact_date"] || ""} className="date-input-lg h-11 bg-slate-50 border-slate-200" />
                            </div>
                            <div>
                                <Label>{r.contactMethodLabel || "Method of Contact"}<Req /></Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {[
                                        { value: "in_person", label: r.contactInPerson || "In Person" },
                                        { value: "video_call", label: r.contactVideo || "Video Call" },
                                        { value: "phone", label: r.contactPhone || "Phone" },
                                        { value: "email", label: r.contactEmail || "Email" },
                                        { value: "messaging", label: r.contactMessaging || "Messaging" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setContactMethod(opt.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${contactMethod === opt.value
                                                    ? "bg-brand-600 text-white border-brand-600"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </FieldRow>

                        {/* Screening Questions */}
                        {screeningQuestions.length > 0 && (
                            <div>
                                <p className="text-sm font-bold text-slate-700 mb-3">{r.screeningQuestionsTitle || "Screening Questions"}<Req /></p>
                                <div className="space-y-4">
                                    {screeningQuestions.map((q, i) => (
                                        <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 mb-2">Q{i + 1} — {q}</p>
                                            <Textarea
                                                rows={3}
                                                placeholder={r.screeningAnswerPlaceholder || "Response (max 3 lines)"}
                                                value={screeningAnswers[i] || ""}
                                                onChange={(e) => {
                                                    const updated = [...screeningAnswers];
                                                    updated[i] = e.target.value;
                                                    setScreeningAnswers(updated);
                                                }}
                                                className="bg-white border-slate-200 rounded-lg resize-none text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Language Proficiency */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-bold text-slate-700">{r.languagesTitle || "Language Proficiency"}</p>
                                <Button type="button" variant="outline" size="sm" onClick={addLanguage} className="text-xs h-8 gap-1">
                                    <Plus className="h-3 w-3" /> {r.addLanguageButton || "Add Language"}
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {languages.map((lang, i) => (
                                    <div key={i} className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <Label>{r.languageLabel || "Language"}</Label>
                                            <select
                                                value={lang.language}
                                                onChange={(e) => updateLanguage(i, "language", e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="">— Select language —</option>
                                                {EUROPEAN_LANGUAGE_OPTIONS.map((l) => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <Label>{r.proficiencyLabel || "Level"}</Label>
                                            <select
                                                value={lang.proficiency}
                                                onChange={(e) => updateLanguage(i, "proficiency", e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="">—</option>
                                                <option value="native">{r.profNative || "Native"}</option>
                                                <option value="fluent">{r.profFluent || "Fluent"}</option>
                                                <option value="professional">{r.profProfessional || "Professional"}</option>
                                                <option value="conversational">{r.profConversational || "Conversational"}</option>
                                                <option value="basic">{r.profBasic || "Basic"}</option>
                                            </select>
                                        </div>
                                        {languages.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLanguage(i)}
                                                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─────────────────── SECTION 6 – ASSESSMENT ─────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <SectionHeader icon={ClipboardList} title={r.sec6Title || "Candidate Assessment Summary"} number={6} />

                    <div className="space-y-5">
                        <div>
                            <Label>{r.assessmentLabel || "Assessment Summary (max 7 lines)"}</Label>
                            <Textarea
                                name="cover_note"
                                rows={7}
                                placeholder={r.assessmentPlaceholder || "CV vs Job Description Match, Key Technical Skills, Soft Skills, Tools, Risk Factors..."}
                                defaultValue={draftTextFields["cover_note"] || ""}
                                className="bg-slate-50 border-slate-200 rounded-xl resize-none"
                            />
                        </div>

                        {/* Declaration */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                            <p className="text-sm font-bold text-amber-900 mb-3">{r.declarationTitle || "Recruiter Declaration & Consent Confirmation"}</p>
                            <p className="text-sm text-amber-800 leading-relaxed mb-4">
                                {r.declarationText || "I confirm that I have personally communicated with this candidate and have obtained their explicit consent to represent them for this specific position."}
                            </p>
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={declared}
                                    onChange={(e) => setDeclared(e.target.checked)}
                                    required
                                    className="mt-0.5 h-5 w-5 rounded accent-brand-600 shrink-0"
                                />
                                <span className="text-sm font-semibold text-amber-900">
                                    I confirm the above declaration (Mandatory)
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {formError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
                        <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        {formError}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-sm text-slate-500 hover:text-slate-700 font-medium px-4 py-2"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            className="h-12 px-6 rounded-xl font-bold"
                        >
                            {r.saveDraft || "Save Draft"}
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || !declared}
                            className="h-12 px-10 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 text-base font-bold gap-2 disabled:opacity-60"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                r.presentCandidateButton || "Present Candidate"
                            )}
                        </Button>
                    </div>
                </div>

                {/* Copyright Footer */}
                <div className="flex flex-col items-center gap-3 py-6 border-t border-slate-100 mt-4">
                    <Image
                        src="/recruito-logo.png"
                        alt="Recruito"
                        width={90}
                        height={24}
                        className="h-6 w-auto object-contain opacity-60"
                    />
                    <p className="text-xs text-slate-400">
                        {r.copyrightText || "© 2026 Recruito. All rights reserved."}
                    </p>
                </div>
            </form>
        </div>
    );
}
