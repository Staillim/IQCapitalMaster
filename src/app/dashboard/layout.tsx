import { Header } from "@/components/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background p-4 md:p-8 lg:p-10 pb-24 sm:pb-8">
        {children}
      </main>
      {/* The BottomNav can be conditionally rendered based on user role if needed */}
      <BottomNav />
    </div>
  );
}
