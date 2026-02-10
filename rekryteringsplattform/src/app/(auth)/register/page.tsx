import Link from "next/link";
import { Building2, UserSearch } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-block">
            <span className="text-2xl font-bold text-brand-600">Rekryto</span>
          </Link>
          <h1 className="text-2xl font-bold">Skapa konto</h1>
          <p className="mt-2 text-muted-foreground">
            Välj vilken typ av konto du vill skapa
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/register/company">
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                  <Building2 className="h-8 w-8 text-brand-600" />
                </div>
                <CardTitle>Företag</CardTitle>
                <CardDescription>
                  Jag vill publicera jobb och hitta kandidater via rekryterare
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/register/recruiter">
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                  <UserSearch className="h-8 w-8 text-success-500" />
                </div>
                <CardTitle>Rekryterare</CardTitle>
                <CardDescription>
                  Jag är frilansande rekryterare och vill hitta kandidater åt
                  företag
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Har du redan ett konto?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Logga in
          </Link>
        </p>
      </div>
    </div>
  );
}
