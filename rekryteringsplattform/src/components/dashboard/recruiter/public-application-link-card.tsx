"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PublicApplicationLinkCardProps = {
  url: string;
};

export function PublicApplicationLinkCard({ url }: PublicApplicationLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" />
            Kandidatlänk
          </p>
          <h2 className="mt-1 text-lg font-semibold">Publik ansökningslänk</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Skicka den här länken till kandidater. Ansökningar hamnar direkt i AI-screeninglistan för detta mandat.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-2 shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopierad" : "Kopiera"}
          </Button>
          <Button asChild type="button" variant="outline" className="gap-2 shrink-0">
            <Link href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Öppna
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

