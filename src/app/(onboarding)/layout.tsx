import { AuthProvider } from '@/components/pulse/auth-provider';
import { ToastProvider } from '@/components/pulse/toast';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
