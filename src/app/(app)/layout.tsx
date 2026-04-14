import { Sidebar } from '@/components/pulse/sidebar';
import { BottomBar } from '@/components/pulse/bottom-bar';
import { ToastProvider } from '@/components/pulse/toast';
import { AuthProvider } from '@/components/pulse/auth-provider';
import { PushPrompt } from '@/components/pwa/push-prompt';
import { SidebarProvider } from '@/components/pulse/sidebar-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <SidebarProvider>
          <div className="flex min-h-screen bg-bg">
            <Sidebar />
            <main className="flex-1 pb-20 md:pb-0 min-w-0">
              {children}
            </main>
            <BottomBar />
            <PushPrompt />
          </div>
        </SidebarProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
