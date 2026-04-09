import { Header } from '@/components/layout/header';
import { NavAdmin } from '@/components/layout/nav-admin';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
