import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/dal";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Header initialUser={session?.user ?? null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
