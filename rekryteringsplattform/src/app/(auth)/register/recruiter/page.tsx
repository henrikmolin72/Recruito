import Link from "next/link";
import { RegisterRecruiterForm } from "@/components/auth/register-recruiter-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterRecruiterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link href="/" className="mb-4 inline-block">
            <span className="text-2xl font-bold text-brand-600">Rekryto</span>
          </Link>
          <CardTitle>Skapa rekryterarkonto</CardTitle>
          <CardDescription>
            Berätta om din erfarenhet. Ditt konto granskas av en admin innan du
            kan ta uppdrag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterRecruiterForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Har du redan ett konto?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:underline"
            >
              Logga in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
