"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useTranslations();

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? t("components.submitButtonSaving") : children}
    </Button>
  );
}
