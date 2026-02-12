"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterCompanyPage() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-2xl font-bold text-brand-600">Rekryto</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Registrera företag</CardTitle>
            <CardDescription>Skapa ett företagskonto för att börja rekrytera</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Företagsnamn</label>
                <Input placeholder="AB Företaget" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Organisationsnummer</label>
                <Input placeholder="556xxx-xxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Kontaktperson</label>
                <Input placeholder="Förnamn Efternamn" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" placeholder="namn@foretag.se" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" placeholder="Minst 8 tecken" />
              </div>
              <Button className="w-full" size="lg">Skapa konto</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Redan registrerad?{" "}
              <Link href="/login" className="text-brand-600 hover:underline font-medium">Logga in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
