"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inställningar</h1>
        <p className="text-muted-foreground">Plattformsinställningar</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Avgifter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Standardavgift (%)</label>
                <Input type="number" defaultValue="15" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Plattformsandel (%)</label>
                <Input type="number" defaultValue="25" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Garantiperiod (dagar)</label>
                <Input type="number" defaultValue="90" />
              </div>
            </div>
            <Button className="mt-4">Spara</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Begränsningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Max rekryterare per jobb</label>
                <Input type="number" defaultValue="5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Max aktiva mandat per rekryterare</label>
                <Input type="number" defaultValue="5" />
              </div>
            </div>
            <Button className="mt-4">Spara</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>E-postinställningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Avsändarnamn</label>
                <Input defaultValue="Rekryto" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Avsändaradress</label>
                <Input defaultValue="noreply@rekryto.se" />
              </div>
            </div>
            <Button className="mt-4">Spara</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
