import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IQCapitalLogo } from "@/components/IQCapitalLogo";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <IQCapitalLogo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">¿Olvidaste tu Contraseña?</CardTitle>
            <CardDescription>
              Ingresa tu correo para recibir un enlace de recuperación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="m@ejemplo.com" required className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Enviar Enlace de Recuperación
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              ¿Recordaste tu contraseña?{" "}
              <Link href="/" className="underline text-primary hover:text-primary/80">
                Iniciar Sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
