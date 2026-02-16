import Link from "next/link";
import { Building2, UserSearch } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-brand-600">
            Rekryto
          </Link>
          <p className="mt-2 text-muted-foreground">
            Skapa ditt konto — välj din roll
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/register/company"
            className="group rounded-lg border-2 border-border bg-card p-8 text-center transition-all hover:border-brand-500 hover:shadow-lg"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 transition-colors group-hover:bg-brand-200">
              <Building2 className="h-8 w-8 text-brand-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Företag</h2>
            <p className="text-sm text-muted-foreground">
              Publicera jobb och hitta rätt kandidater genom våra kvalificerade
              rekryterare. Betala bara vid lyckad anställning.
            </p>
          </Link>

          <Link
            href="/register/recruiter"
            className="group rounded-lg border-2 border-border bg-card p-8 text-center transition-all hover:border-success-500 hover:shadow-lg"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 transition-colors group-hover:bg-green-100">
              <UserSearch className="h-8 w-8 text-success-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Rekryterare</h2>
            <p className="text-sm text-muted-foreground">
              Få tillgång till fler uppdrag och tjäna 75% av avgiften. Arbeta
              flexibelt med ditt eget nätverk.
            </p>
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
