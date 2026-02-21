"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const { t } = useTranslations();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("components.submitButtonSaving") : children}
    </Button>
  );
}
