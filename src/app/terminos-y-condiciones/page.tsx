import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IQCapitalLogo } from "@/components/IQCapitalLogo";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex justify-center">
          <IQCapitalLogo />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-center">
              Términos y Condiciones
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Última actualización: 8 de octubre de 2025
            </p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
              <p className="text-muted-foreground">
                Al registrarse y utilizar los servicios del Fondo de Ahorros y Préstamos "FAP" 
                (en adelante, "el Fondo"), usted acepta estar legalmente vinculado por estos 
                Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, 
                no debe utilizar nuestros servicios.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">2. Requisitos de Elegibilidad</h2>
              <p className="text-muted-foreground mb-2">Para utilizar nuestros servicios, usted debe:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Ser mayor de 18 años de edad</li>
                <li>Proporcionar información de registro veraz y completa</li>
                <li>Mantener actualizada su información de contacto</li>
                <li>Ser residente en Colombia</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">3. Servicios del Fondo</h2>
              <p className="text-muted-foreground mb-2">El Fondo ofrece los siguientes servicios:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Ahorros:</strong> Aportes mensuales con cuota mínima establecida por el administrador</li>
                <li><strong>Préstamos:</strong> Financiamiento para asociados y clientes con tasas de interés diferenciadas</li>
                <li><strong>Reuniones:</strong> Asambleas presenciales o virtuales con registro de asistencia</li>
                <li><strong>Estados de Cuenta:</strong> Reportes periódicos de movimientos financieros</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">4. Ahorros</h2>
              <h3 className="text-lg font-semibold mb-2">4.1 Aportes Mensuales</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Cada asociado debe realizar un aporte mínimo mensual definido por el administrador</li>
                <li>Los aportes pueden realizarse de forma presencial o virtual</li>
                <li>Los aportes mayores a la cuota mínima son permitidos y bienvenidos</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">4.2 Retiros</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Los retiros antes de finalizar el año implican la pérdida de todas las ganancias generadas</li>
                <li>Los retiros deben programarse con al menos un mes de anticipación</li>
                <li>El Fondo se reserva el derecho de aprobar o rechazar solicitudes de retiro anticipado</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">4.3 Cuota de Manejo Anual</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Todos los asociados deben pagar una cuota de manejo anual</li>
                <li>Si la cuota no es cancelada, será descontada automáticamente del ahorro individual</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">5. Préstamos</h2>
              <h3 className="text-lg font-semibold mb-2">5.1 Tasas de Interés</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Asociados: 2% de interés mensual</li>
                <li>Clientes: 2.5% de interés mensual</li>
                <li>Las tasas pueden ser ajustadas anualmente por el administrador</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">5.2 Codeudores Solidarios</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Los asociados pueden aprobar préstamos a terceros actuando como codeudores solidarios</li>
                <li>El codeudor asume responsabilidad completa en caso de incumplimiento del deudor principal</li>
                <li>El Fondo puede ejercer acciones legales contra codeudores en caso de mora</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">5.3 Pagos y Abonos</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Los abonos deben registrarse con monto y fecha exacta</li>
                <li>Los pagos atrasados generarán intereses de mora adicionales</li>
                <li>El incumplimiento de pagos afectará su historial crediticio en el Fondo</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">6. Reuniones</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Las reuniones pueden ser presenciales o virtuales</li>
                <li>La asistencia a reuniones es obligatoria para todos los asociados</li>
                <li>Las reuniones presenciales pueden tener un costo de ingreso</li>
                <li>La inasistencia sin justificación generará multas automáticas</li>
                <li>Para reuniones presenciales se validará la ubicación mediante GPS</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">7. Privacidad y Protección de Datos</h2>
              <p className="text-muted-foreground mb-2">
                Al utilizar nuestros servicios, usted acepta que:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Recopilamos y almacenamos información personal necesaria para la operación del Fondo</li>
                <li>Utilizamos su ubicación GPS para validar aportes presenciales y asistencia a reuniones</li>
                <li>Capturamos firmas digitales como comprobante de transacciones</li>
                <li>Enviamos notificaciones sobre reuniones, vencimientos y eventos importantes</li>
                <li>Sus datos están protegidos según la Ley 1581 de 2012 de Protección de Datos Personales de Colombia</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">8. Sanciones y Multas</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>El incumplimiento de las obligaciones genera sanciones automáticas</li>
                <li>Las multas por inasistencia a reuniones son calculadas automáticamente</li>
                <li>Las sanciones se reflejan en el estado de cuenta mensual</li>
                <li>El administrador puede establecer multas adicionales según reglamento interno</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">9. Roles y Responsabilidades</h2>
              <h3 className="text-lg font-semibold mb-2">9.1 Clientes</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Pueden solicitar préstamos con interés del 2.5%</li>
                <li>Deben cumplir con los pagos según calendario acordado</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">9.2 Asociados</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Deben realizar aportes mensuales mínimos</li>
                <li>Pueden solicitar préstamos con interés del 2%</li>
                <li>Pueden aprobar préstamos actuando como codeudores</li>
                <li>Deben asistir a reuniones programadas</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">9.3 Administradores</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Gestionan las operaciones del Fondo</li>
                <li>Establecen tasas, cuotas y parámetros del sistema</li>
                <li>Supervisan el cumplimiento de las obligaciones</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">10. Modificaciones</h2>
              <p className="text-muted-foreground">
                El Fondo se reserva el derecho de modificar estos términos en cualquier momento. 
                Los cambios entrarán en vigencia inmediatamente después de su publicación en la 
                aplicación. Es responsabilidad del usuario revisar periódicamente estos términos.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">11. Terminación del Servicio</h2>
              <p className="text-muted-foreground mb-2">El Fondo puede suspender o terminar su cuenta si:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Proporciona información falsa o fraudulenta</li>
                <li>Incumple repetidamente con sus obligaciones financieras</li>
                <li>Viola estos términos y condiciones</li>
                <li>Realiza actividades que perjudiquen al Fondo o a otros miembros</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">12. Limitación de Responsabilidad</h2>
              <p className="text-muted-foreground">
                El Fondo no será responsable por daños indirectos, incidentales, especiales o 
                consecuentes derivados del uso o la imposibilidad de uso de los servicios, 
                incluyendo pero no limitado a pérdida de beneficios, interrupción del negocio o 
                pérdida de información.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">13. Ley Aplicable y Jurisdicción</h2>
              <p className="text-muted-foreground">
                Estos términos se rigen por las leyes de la República de Colombia. Cualquier 
                disputa será resuelta en los tribunales competentes de Colombia.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">14. Contacto</h2>
              <p className="text-muted-foreground">
                Para preguntas sobre estos términos y condiciones, puede contactarnos a través de:
              </p>
              <ul className="list-none pl-0 text-muted-foreground space-y-1 mt-2">
                <li><strong>Email:</strong> soporte@iqcapitalmaster.com</li>
                <li><strong>Teléfono:</strong> +57 300 123 4567</li>
                <li><strong>Dirección:</strong> Calle Ejemplo 123, Bogotá, Colombia</li>
              </ul>
            </section>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                Al hacer clic en "Registrarse" durante el proceso de registro, usted confirma 
                que ha leído, entendido y acepta estos Términos y Condiciones en su totalidad.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Link href="/register">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Registro
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
