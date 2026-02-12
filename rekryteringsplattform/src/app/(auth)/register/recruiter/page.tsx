"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterRecruiterPage() {
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
            <CardTitle>Bli rekryterare</CardTitle>
            <CardDescription>Skapa ett rekryterarkonto och börja tjäna pengar</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Förnamn</label>
                  <Input placeholder="Erik" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Efternamn</label>
                  <Input placeholder="Lindgren" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" placeholder="erik@example.se" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <Input type="tel" placeholder="+46 70 123 45 67" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">LinkedIn-profil</label>
                <Input placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" placeholder="Minst 8 tecken" />
              </div>
              <Button className="w-full bg-success-500 hover:bg-success-700" size="lg">
                Skicka ansökan
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Din ansökan granskas innan kontot aktiveras.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
