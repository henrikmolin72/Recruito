"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ReleaseMandateButtonProps {
  mandateId: string;
  jobTitle: string;
}

export function ReleaseMandateButton({ mandateId, jobTitle }: ReleaseMandateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRelease() {
    setLoading(true);
    const { error } = await supabase
      .from("job_mandates")
      .update({ is_active: false, released_at: new Date().toISOString() })
      .eq("id", mandateId);

    if (error) {
      toast.error("Kunde inte släppa mandat", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Mandatet har släppts");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">Släpp</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Släpp mandat</DialogTitle>
          <DialogDescription>
            Är du säker på att du vill släppa mandatet för &quot;{jobTitle}&quot;? Du förlorar inte redan presenterade kandidater.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button variant="destructive" onClick={handleRelease} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Släpp mandat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
