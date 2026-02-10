const APP_NAME = "Rekryto";
const PRIMARY_COLOR = "#2563eb";

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:${PRIMARY_COLOR};font-size:24px;margin:0;">${APP_NAME}</h1>
      </div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;color:#71717a;font-size:12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. Alla rättigheter förbehållna.</p>
        <p>Du får detta mejl för att du har ett konto hos ${APP_NAME}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function candidatePresented(
  jobTitle: string,
  candidateName: string
): { subject: string; html: string } {
  return {
    subject: `Ny kandidat presenterad för ${jobTitle}`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Ny kandidat presenterad</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        En rekryterare har presenterat <strong>${candidateName}</strong> som kandidat för tjänsten <strong>${jobTitle}</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Logga in på plattformen för att granska kandidaten och ge feedback.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/company/jobs" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Granska kandidat
        </a>
      </div>
    `),
  };
}

export function candidateStatusChanged(
  candidateName: string,
  newStatus: string
): { subject: string; html: string } {
  const statusLabels: Record<string, string> = {
    submitted: "Inskickad",
    reviewing: "Under granskning",
    interview: "Intervju",
    offered: "Erbjudande",
    hired: "Anställd",
    guarantee_period: "Garantiperiod",
    completed: "Avslutad",
    rejected: "Nekad",
    declined: "Avböjd",
  };

  const statusLabel = statusLabels[newStatus] || newStatus;

  return {
    subject: `Statusuppdatering för ${candidateName}`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Kandidatstatus uppdaterad</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Statusen för <strong>${candidateName}</strong> har ändrats till <strong>${statusLabel}</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Logga in för att se mer information.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Se detaljer
        </a>
      </div>
    `),
  };
}

export function mandateTaken(
  jobTitle: string,
  recruiterName: string
): { subject: string; html: string } {
  return {
    subject: `${recruiterName} har tagit uppdraget för ${jobTitle}`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Nytt uppdrag taget</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        <strong>${recruiterName}</strong> har tagit uppdraget att rekrytera för tjänsten <strong>${jobTitle}</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Rekryteraren kan nu börja söka och presentera kandidater.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/company/jobs" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Se dina jobb
        </a>
      </div>
    `),
  };
}

export function placementConfirmed(
  candidateName: string,
  jobTitle: string
): { subject: string; html: string } {
  return {
    subject: `Placering bekräftad: ${candidateName} till ${jobTitle}`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Placering bekräftad!</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        <strong>${candidateName}</strong> har blivit placerad i tjänsten <strong>${jobTitle}</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Garantiperioden har nu påbörjats. Du kan följa processen i din dashboard.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Gå till dashboard
        </a>
      </div>
    `),
  };
}

export function payoutReleased(
  amount: number
): { subject: string; html: string } {
  const formatted = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return {
    subject: `Utbetalning på ${formatted} har skickats`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Utbetalning genomförd</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        En utbetalning på <strong>${formatted}</strong> har skickats till ditt konto.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Pengarna kommer att vara tillgängliga inom 2-3 bankdagar beroende på din bank.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/recruiter/earnings" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Se intjäning
        </a>
      </div>
    `),
  };
}

export function recruiterApproved(): { subject: string; html: string } {
  return {
    subject: "Ditt konto har godkänts!",
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Välkommen till ${APP_NAME}!</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Ditt rekryterarkonto har blivit granskat och <strong>godkänt</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Du kan nu bläddra bland tillgängliga uppdrag och börja presentera kandidater.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/recruiter/jobs" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Se tillgängliga uppdrag
        </a>
      </div>
    `),
  };
}

export function newMessage(
  jobTitle: string,
  senderName: string
): { subject: string; html: string } {
  return {
    subject: `Nytt meddelande från ${senderName} angående ${jobTitle}`,
    html: layout(`
      <h2 style="color:#18181b;font-size:18px;margin:0 0 12px;">Nytt meddelande</h2>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        <strong>${senderName}</strong> har skickat ett meddelande angående <strong>${jobTitle}</strong>.
      </p>
      <p style="color:#3f3f46;line-height:1.6;margin:0 0 16px;">
        Logga in för att läsa och svara på meddelandet.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background-color:${PRIMARY_COLOR};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">
          Läs meddelande
        </a>
      </div>
    `),
  };
}
