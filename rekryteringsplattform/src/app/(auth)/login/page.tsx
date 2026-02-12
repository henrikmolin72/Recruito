"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
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
            <CardTitle>Logga in</CardTitle>
            <CardDescription>Ange dina uppgifter för att fortsätta</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input type="email" placeholder="namn@foretag.se" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lösenord</label>
                <Input type="password" placeholder="Ange lösenord" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Kom ihåg mig
                </label>
                <a href="#" className="text-brand-600 hover:underline">Glömt lösenord?</a>
              </div>
              <Button className="w-full" size="lg">Logga in</Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Har du inget konto?{" "}
              <Link href="/register" className="text-brand-600 hover:underline font-medium">
                Registrera dig
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
