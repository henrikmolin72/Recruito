import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";

const MOCK_RECRUITERS = [
  { id: 1, name: "Erik Lindgren", email: "erik@email.se", industry: "IT & Tech", status: "approved", placements: 12, rating: 4.8, mandates: 3 },
  { id: 2, name: "Anna Svensson", email: "anna@email.se", industry: "Finans & Bank", status: "approved", placements: 8, rating: 4.5, mandates: 2 },
  { id: 3, name: "Karl Pettersson", email: "karl@email.se", industry: "IT & Tech", status: "approved", placements: 15, rating: 4.9, mandates: 4 },
  { id: 4, name: "Sofia Larsson", email: "sofia@email.se", industry: "Finans & Bank", status: "pending", placements: 0, rating: 0, mandates: 0 },
  { id: 5, name: "Andreas Björk", email: "andreas@email.se", industry: "IT & Tech", status: "pending", placements: 0, rating: 0, mandates: 0 },
  { id: 6, name: "Lisa Olsson", email: "lisa@email.se", industry: "Sälj & Marknad", status: "suspended", placements: 3, rating: 3.2, mandates: 0 },
];

export default function AdminRecruitersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rekryterare</h1>
          <p className="text-muted-foreground">Hantera rekryterare på plattformen</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök rekryterare..." className="pl-10" />
        </div>
        <select className="h-10 rounded-lg border border-input bg-white px-3 text-sm">
          <option>Alla statusar</option>
          <option>Godkända</option>
          <option>Väntande</option>
          <option>Avstängda</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Bransch</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Placeringar</th>
                <th className="p-4 font-medium text-muted-foreground">Betyg</th>
                <th className="p-4 font-medium text-muted-foreground">Mandat</th>
                <th className="p-4 font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECRUITERS.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={r.name.split(" ").map(n => n[0]).join("")} size="sm" />
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><Badge variant="outline">{r.industry}</Badge></td>
                  <td className="p-4">
                    <Badge variant={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}>
                      {r.status === "approved" ? "Godkänd" : r.status === "pending" ? "Väntande" : "Avstängd"}
                    </Badge>
                  </td>
                  <td className="p-4">{r.placements}</td>
                  <td className="p-4">
                    {r.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
                        <span>{r.rating}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-4">{r.mandates}/5</td>
                  <td className="p-4">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-success-500 hover:bg-success-700 h-7 text-xs">Godkänn</Button>
                        <Button size="sm" variant="danger" className="h-7 text-xs">Neka</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs">Visa</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
