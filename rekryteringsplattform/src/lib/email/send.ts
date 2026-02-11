"use server";

import { getResend } from "./client";

export async function sendEmail(to: string, subject: string, html: string) {
  await getResend().emails.send({
    from: `${process.env.NEXT_PUBLIC_APP_NAME} <noreply@rekryto.se>`,
    to,
    subject,
    html,
  });
}
