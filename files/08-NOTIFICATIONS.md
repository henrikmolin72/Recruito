# STEG 8: Notifieringar

## Instruktioner till Claude Code

In-app notifieringar + e-post via Resend.

---

## 8.1 In-app notifieringar

### Notifikations-hook
```typescript
// src/hooks/use-notifications.ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    }
    fetch();

    // Realtime nya notifieringar
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

### Notifikations-dropdown (i header)
- Klocka-ikon (Bell från lucide-react) med röd badge som visar `unreadCount`
- Dropdown (Popover) med lista:
  - Titel, body, tidsstämpel
  - Olästa markerade med blå bakgrund
  - Klick → `markAsRead()` + navigera till `link`
- "Markera alla som lästa" knapp
- "Visa alla" länk

---

## 8.2 E-postnotifieringar (Resend)

### Setup
```typescript
// src/lib/email/client.ts
import { Resend } from "resend";
export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Skicka e-post (server action)
```typescript
// src/lib/email/send.ts
"use server";
import { resend } from "./client";

export async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({
    from: `${process.env.NEXT_PUBLIC_APP_NAME} <noreply@yourdomain.se>`,
    to,
    subject,
    html,
  });
}
```

### E-postmallar (`src/lib/email/templates.ts`)
Bygg enkla HTML-mallar som funktioner. Varje mall returnerar `{ subject: string, html: string }`.

**Mallar att bygga:**

| Trigger | Mottagare | Ämne |
|---------|-----------|------|
| Ny kandidat presenterad | Företag | "Ny kandidat för [Jobbtitel]" |
| Kandidat statusändrad | Rekryterare | "Statusuppdatering: [Kandidatnamn]" |
| Nytt mandat taget | Företag | "En rekryterare arbetar nu med [Jobbtitel]" |
| Placering bekräftad | Båda | "Anställning bekräftad!" |
| Utbetalning frigiven | Rekryterare | "Utbetalning: [Belopp] SEK" |
| Rekryterare godkänd | Rekryterare | "Välkommen! Du är nu godkänd" |
| Nytt meddelande | Mottagare | "Nytt meddelande angående [Jobbtitel]" |

### Trigger-hjälpfunktion
```typescript
// src/lib/notifications/create.ts
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

  // In-app notifiering
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    link,
  });

  // E-post (om mall skickas med)
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
```

**Gå vidare till:** [09-PAYMENTS.md](./09-PAYMENTS.md)
