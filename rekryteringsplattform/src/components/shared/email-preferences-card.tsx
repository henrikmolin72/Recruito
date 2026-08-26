import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";
import { updateEmailPreferences } from "@/lib/actions/email-preferences";

/**
 * Notification-email opt-out toggle. Self-contained server component: loads the
 * current user's flag itself so it can mount on any role's profile page. The
 * flag is enforced at the email dispatch chokepoint, so unchecking silences all
 * notification email (transactional account mail still goes out).
 */
export async function EmailPreferencesCard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("email_opt_out")
        .eq("id", user.id)
        .maybeSingle();

    const dict = await getDictionary();
    const optOut = (profile as { email_opt_out?: boolean } | null)?.email_opt_out === true;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{dict.common.emailPrefsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    action={async (formData: FormData) => {
                        "use server";
                        await updateEmailPreferences(formData);
                    }}
                    className="space-y-4"
                >
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="email_notifications"
                            defaultChecked={!optOut}
                            className="mt-0.5 h-4 w-4 rounded border-input"
                        />
                        <span>
                            <span className="block text-sm font-medium">{dict.common.emailPrefsReceiveLabel}</span>
                            <span className="block text-xs text-muted-foreground">{dict.common.emailPrefsHint}</span>
                        </span>
                    </label>
                    <SubmitButton>{dict.common.saveChanges}</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}
