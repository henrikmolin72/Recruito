"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export async function notify(
  userId: string,
  title: string,
  body: string,
  link?: string,
  emailTemplate?: { subject: string; html: string }
) {
  const supabase = await createClient();

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    link,
  });

  if (emailTemplate) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profile?.email) {
      await sendEmail(profile.email, emailTemplate.subject, emailTemplate.html);
    }
  }
}
