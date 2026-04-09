import { Header } from '@/components/layout/header';
import { NavAthlete } from '@/components/layout/nav-athlete';

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <NavAthlete />
        <main className="flex-1 pb-20 md:pb-0 md:p-8">{children}</main>
      </div>
    </div>
  );
}
