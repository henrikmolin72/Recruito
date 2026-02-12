"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function RecruiterProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Min profil</h1>
        <p className="text-muted-foreground">Hantera din rekryterarprofil</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personuppgifter</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Förnamn</label>
                  <Input defaultValue="Erik" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Efternamn</label>
                  <Input defaultValue="Lindgren" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">E-post</label>
                <Input defaultValue="erik.lindgren@email.se" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <Input defaultValue="+46 70 123 45 67" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">LinkedIn</label>
                <Input defaultValue="https://linkedin.com/in/eriklindgren" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[100px]"
                  defaultValue="Erfaren IT-rekryterare med 10+ års erfarenhet. Specialiserad inom Tech och Engineering i Stockholmsregionen."
                />
              </div>
              <Button>Spara ändringar</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Kontostatus</span>
                <Badge variant="success">Godkänd</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Betyg</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                  <span className="text-sm font-medium">4.8</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Placeringar</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bransch</span>
                <Badge variant="outline">IT & Tech</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
