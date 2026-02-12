"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function CompanyProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företagsprofil</h1>
        <p className="text-muted-foreground">Hantera din företagsinformation</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Företagsinformation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Företagsnamn</label>
                  <Input defaultValue="TechCorp AB" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Organisationsnummer</label>
                  <Input defaultValue="556789-1234" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Adress</label>
                <Input defaultValue="Kungsgatan 12, 111 43 Stockholm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktperson</label>
                  <Input defaultValue="Maria Johansson" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-post</label>
                  <Input defaultValue="maria@techcorp.se" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Beskrivning</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-white px-3 py-2 text-sm min-h-[100px]"
                  defaultValue="TechCorp AB är ett snabbväxande SaaS-företag med fokus på AI-driven automation."
                />
              </div>
              <Button>Spara ändringar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logotyp</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="h-24 w-24 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-12 w-12 text-brand-600" />
            </div>
            <Button variant="outline" size="sm">Ladda upp logotyp</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
