"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TakeMandateButtonProps {
  jobId: string;
  recruiterId: string;
  isFull: boolean;
  activeMandates: number;
}

export function TakeMandateButton({
  jobId,
  recruiterId,
  isFull,
  activeMandates,
}: TakeMandateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const canTake = !isFull && activeMandates < 5;

  async function handleTakeMandate() {
    setLoading(true);
    const { error } = await supabase.from("job_mandates").insert({
      job_id: jobId,
      recruiter_id: recruiterId,
    });

    if (error) {
      toast.error("Kunde inte ta mandat", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Du har tagit mandat för detta jobb!");
    setOpen(false);
    router.refresh();
  }

  if (!canTake) {
    return (
      <Button disabled className="w-full">
        {isFull ? "Alla mandatplatser tagna" : "Max 5 aktiva mandat (du har 5)"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-success-500 hover:bg-success-700" size="lg">
          Ta mandat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bekräfta mandat</DialogTitle>
          <DialogDescription>
            Du tar mandat för detta uppdrag. Du har {activeMandates}/5 aktiva
            mandat. Med detta blir det {activeMandates + 1}/5.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleTakeMandate}
            disabled={loading}
            className="bg-success-500 hover:bg-success-700"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Bekräfta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
