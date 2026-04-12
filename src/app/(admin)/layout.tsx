import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { NavAdmin } from '@/components/layout/nav-admin';
import { requireAdmin } from '@/lib/admin/guard';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (auth.error) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <NavAdmin />
        <main className="flex-1 bg-gray-50/50 pb-20 md:pb-0 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
