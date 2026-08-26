import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star, ClipboardList, Sparkles } from "lucide-react";
import { completeRecruiterOnboarding, getRecruiterProfile, updateRecruiterProfile } from "@/lib/actions/recruiter";
import { SubmitButton } from "@/components/shared/submit-button";
import { EmailPreferencesCard } from "@/components/shared/email-preferences-card";
import { AppLogo } from "@/components/shared/app-logo";
import { getDictionary } from "@/i18n/server";
import {
  AVAILABLE_HOURS_OPTIONS,
  AVERAGE_TIME_TO_FILL_OPTIONS,
  COUNTRY_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
  PRIMARY_INDUSTRY_OPTIONS,
  SENIORITY_FOCUS_OPTIONS,
  SOURCING_CHANNEL_OPTIONS,
} from "@/lib/recruiter-onboarding-options";

export default async function RecruiterProfilePage() {
  const { profile, recruiter } = await getRecruiterProfile();
  const dict = await getDictionary();
  const r = dict.recruiter;

  const onboardingDone = !!recruiter?.onboarding_completed_at;
  const primaryIndustries = Array.isArray(recruiter?.primary_industries) ? recruiter.primary_industries : [];
  const countriesExperience = Array.isArray(recruiter?.countries_experience) ? recruiter.countries_experience : [];
  const seniorityFocus = Array.isArray(recruiter?.seniority_focus) ? recruiter.seniority_focus : [];
  const sourcingChannels = Array.isArray(recruiter?.sourcing_channels) ? recruiter.sourcing_channels : [];
  const languages = Array.isArray(recruiter?.languages_spoken) ? recruiter.languages_spoken : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.profilePageTitle}</h1>
        <p className="text-muted-foreground">{r.profilePageSubtitle}</p>
      </div>

      {!onboardingDone && (
        <Card className="overflow-hidden border-emerald-200 shadow-lg shadow-emerald-100/40">
          <div className="grid lg:grid-cols-[1fr_1.55fr]">
            <div className="bg-slate-900 text-white p-6 lg:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                Recruiter Onboarding
              </div>
              <div className="mt-4">
                <AppLogo size="md" priority />
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight">Complete your recruiter profile</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Fill in your recruiting capacity, markets and sourcing strengths so Recruito can route better mandates and speed up approval.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">What happens next?</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Your onboarding details are saved internally and sent automatically to the Recruito team for review. You will not need to send a separate email.
                </p>
              </div>
            </div>

            <CardContent className="p-6 lg:p-8">
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await completeRecruiterOnboarding(formData);
                }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Upload Photo</label>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700 hover:file:bg-brand-100"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Optional, but recommended for faster approval.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Primary Industries</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
                      {PRIMARY_INDUSTRY_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="primary_industries"
                            value={option}
                            defaultChecked={primaryIndustries.includes(option)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Other industry (Specify)</label>
                    <Input name="primary_industries_other" defaultValue={recruiter?.primary_industries_other || ""} placeholder="If you checked Other" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Countries with Recruiting Experience</label>
                    <select
                      name="countries_experience"
                      multiple
                      defaultValue={countriesExperience}
                      className="flex min-h-[140px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Hold Cmd/Ctrl to select multiple.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-brand-600" />
                    <p className="font-semibold">Languages Spoken (language + proficiency)</p>
                  </div>
                  <div className="grid gap-3">
                    {[1, 2, 3, 4].map((row) => {
                      const existing = languages[row - 1] as any;
                      return (
                        <div key={row} className="grid md:grid-cols-[1.25fr_1fr] gap-3">
                          <Input
                            name={`language_name_${row}`}
                            defaultValue={existing?.language || ""}
                            placeholder={`Language ${row}`}
                          />
                          <select
                            name={`language_level_${row}`}
                            defaultValue={existing?.proficiency || ""}
                            className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                          >
                            <option value="">Select proficiency</option>
                            {LANGUAGE_PROFICIENCY_OPTIONS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Seniority Focus</label>
                    <div className="grid sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
                      {SENIORITY_FOCUS_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="seniority_focus"
                            value={option}
                            defaultChecked={seniorityFocus.includes(option)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">How many roles can you manage in a week? (1–10)</label>
                    <Input type="number" min={1} max={10} name="roles_per_week" defaultValue={recruiter?.roles_per_week || ""} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Candidates Sourced in Last 12 Months</label>
                    <Input type="number" min={0} name="candidates_sourced_last_12m" defaultValue={recruiter?.candidates_sourced_last_12m || ""} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Successful Placements in Last 12 Months</label>
                    <Input type="number" min={0} name="successful_placements_last_12m" defaultValue={recruiter?.successful_placements_last_12m || ""} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Average Time to Fill a Role</label>
                    <select
                      name="average_time_to_fill"
                      defaultValue={recruiter?.average_time_to_fill || ""}
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      <option value="">Select</option>
                      {AVERAGE_TIME_TO_FILL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Most Challenging Role You Successfully Filled</label>
                    <Textarea
                      name="challenging_role_example"
                      defaultValue={recruiter?.challenging_role_example || ""}
                      placeholder="Short example (3–4 lines max)"
                      className="min-h-[96px]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Primary Sourcing Channels</label>
                    <div className="grid sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
                      {SOURCING_CHANNEL_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="sourcing_channels"
                            value={option}
                            defaultChecked={sourcingChannels.includes(option)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Other Job Boards / Channel (Specify)</label>
                    <Input name="sourcing_channels_other" defaultValue={recruiter?.sourcing_channels_other || ""} placeholder="Optional" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Available Hours per Week</label>
                    <select
                      name="available_hours_per_week"
                      defaultValue={recruiter?.available_hours_per_week || ""}
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      <option value="">Select</option>
                      {AVAILABLE_HOURS_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <SubmitButton className="w-full sm:w-auto">Complete Recruiter Onboarding</SubmitButton>
              </form>
            </CardContent>
          </div>
        </Card>
      )}

      {onboardingDone && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Recruiter onboarding completed</p>
              <p className="text-xs text-emerald-700">Your detailed profile is saved and ready for internal review/use.</p>
            </div>
            <Badge variant="success">Completed</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{r.personalInfoTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={async (formData: FormData) => {
              "use server";
              await updateRecruiterProfile(formData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.nameLabel}</label>
                <Input name="full_name" defaultValue={profile?.full_name || ""} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.emailLabel}</label>
                <Input defaultValue={profile?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">{r.emailCannotChange}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.phoneLabel}</label>
                <Input name="phone" defaultValue={profile?.phone || ""} placeholder="+46 70 000 00 00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.headlineLabel}</label>
                <Input name="headline" defaultValue={recruiter?.headline || ""} placeholder={r.headlinePlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.linkedinLabel}</label>
                <Input name="linkedin_url" defaultValue={recruiter?.linkedin_url || ""} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{r.bioLabel}</label>
                <Textarea
                  name="bio"
                  defaultValue={recruiter?.bio || ""}
                  placeholder={r.bioPlaceholder}
                  className="min-h-[100px]"
                />
              </div>
              <SubmitButton>{dict.common.saveChanges}</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{r.statusTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{r.accountStatus}</span>
                <Badge variant={recruiter?.approval_status === "approved" ? "success" : "warning"}>
                  {recruiter?.approval_status === "approved" ? r.accountApproved : recruiter?.approval_status === "pending" ? r.accountPendingReview : recruiter?.approval_status || r.accountUnknown}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Onboarding</span>
                <Badge variant={onboardingDone ? "success" : "warning"}>{onboardingDone ? "Complete" : "Incomplete"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{r.ratingLabel}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                  <span className="text-sm font-medium">{recruiter?.rating || "—"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{r.placementsLabel}</span>
                <span className="text-sm font-medium">{recruiter?.total_placements || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{r.experienceLabel}</span>
                <span className="text-sm font-medium">
                  {recruiter?.experience_bracket || (recruiter?.years_experience ? `${recruiter.years_experience} ${dict.common.years}` : "—")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Country</span>
                <span className="text-sm font-medium">{recruiter?.current_country || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailPreferencesCard />
    </div>
  );
}
