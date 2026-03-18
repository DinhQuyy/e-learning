import { Header } from "@/components/layout/header";
import { requireAuth } from "@/lib/dal";

export default async function StandaloneStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();

  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <Header initialUser={user} />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
