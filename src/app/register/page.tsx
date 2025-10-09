'use client';

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { IQCapitalLogo } from "@/components/IQCapitalLogo";
import { User, Mail, Lock, Calendar } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { useToast } from "@/hooks/use-toast";

const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const registerSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  dateOfBirth: z.string().min(1, "La fecha de nacimiento es obligatoria.")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      return birthDate < today;
    }, "La fecha de nacimiento no puede ser futura.")
    .refine((date) => {
      const birthDate = new Date(date);
      const age = calculateAge(birthDate);
      return age >= 18;
    }, "Debes ser mayor de 18 años para registrarte."),
  email: z.string().email("Por favor, introduce una dirección de correo electrónico válida."),
  phone: z.string().length(10, "El número de teléfono debe tener 10 dígitos."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los términos y condiciones para continuar.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  // Escuchar errores de Firebase
  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: string; message: string }>;
      toast({
        variant: "destructive",
        title: "Error al crear cuenta",
        description: customEvent.detail.message,
      });
    };

    window.addEventListener('firebase-auth-error', handleAuthError);
    return () => window.removeEventListener('firebase-auth-error', handleAuthError);
  }, [toast]);

  const onSubmit = (data: RegisterFormValues) => {
    sessionStorage.setItem('registrationData', JSON.stringify({ 
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      phone: `+57${data.phone}`,
      termsAcceptedAt: new Date().toISOString(),
    }));

    initiateEmailSignUp(auth, data.email, data.password);
    
    toast({
      title: "¡Cuenta Creada!",
      description: "Redirigiendo a tu panel...",
    });
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <IQCapitalLogo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Crea una Cuenta</CardTitle>
            <CardDescription>
              ¡Únete a IQCapital Master hoy!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                 <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Nombres</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="John" {...field} className="pl-10"/>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Apellidos</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Doe" {...field} className="pl-10"/>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
                 <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="date" 
                            {...field} 
                            className="pl-10"
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                         <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="m@ejemplo.com" {...field} className="pl-10"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Número de Teléfono</FormLabel>
                      <FormControl>
                         <div className="relative flex items-center">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24" className="h-4 w-6"><rect width="36" height="24" fill="#FFCD00"/><rect y="12" width="36" height="12" fill="#003893"/><rect y="18" width="36" height="6" fill="#CE1126"/></svg>
                                <span className="text-sm text-muted-foreground">+57</span>
                            </div>
                          <Input 
                            type="tel" 
                            placeholder="300 123 4567" 
                            {...field} 
                            className="pl-24"
                            maxLength={10}
                            onChange={(e) => {
                                const onlyDigits = e.target.value.replace(/\D/g, '');
                                field.onChange(onlyDigits);
                            }}
                           />
                        </div>
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                         <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" {...field} className="pl-10"/>
                        </div>
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                         <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" {...field} className="pl-10"/>
                        </div>
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Acepto los{" "}
                          <Link 
                            href="/terminos-y-condiciones" 
                            className="text-primary underline hover:text-primary/80"
                            target="_blank"
                          >
                            términos y condiciones
                          </Link>
                          {" "}del Fondo de Ahorros y Préstamos
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Registrarse
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{" "}
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
