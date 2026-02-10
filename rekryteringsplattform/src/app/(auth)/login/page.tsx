import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mb-4 inline-block">
            <span className="text-2xl font-bold text-brand-600">Rekryto</span>
          </Link>
          <CardTitle>Logga in</CardTitle>
          <CardDescription>
            Ange dina uppgifter för att logga in på ditt konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Har du inget konto?{" "}
            <Link
              href="/register"
              className="font-medium text-brand-600 hover:underline"
            >
              Skapa konto
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
