import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, UserCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-2xl font-bold text-brand-600">Rekryto</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6">Välj kontotyp</h1>
          <p className="text-muted-foreground mt-2">Hur vill du använda Rekryto?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:border-brand-600 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-brand-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Företag</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Jag vill publicera jobb och hitta kandidater genom rekryterare.
              </p>
              <Link href="/register/company">
                <Button className="w-full gap-2">
                  Registrera företag <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-success-500 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
                <UserCircle className="h-8 w-8 text-success-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Rekryterare</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Jag vill ta uppdrag och presentera kandidater från mitt nätverk.
              </p>
              <Link href="/register/recruiter">
                <Button className="w-full gap-2 bg-success-500 hover:bg-success-700">
                  Bli rekryterare <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Redan medlem?{" "}
          <Link href="/login" className="text-brand-600 hover:underline font-medium">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  );
}
