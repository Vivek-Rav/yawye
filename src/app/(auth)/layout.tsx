import TopNav from "@/components/BottomNav";

// Disable prerendering — these pages depend on client-side Firebase auth
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-2xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
