"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteDataButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Är du säker på att du vill radera all din data? Denna åtgärd kan inte ångras. Ditt konto anonymiseras permanent."
    );
    if (!confirmed) return;

    startTransition(async () => {
      await action();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      className="mt-2"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="mr-2 size-4" />
      {isPending ? "Bearbetar..." : "Begär radering av data"}
    </Button>
  );
}
