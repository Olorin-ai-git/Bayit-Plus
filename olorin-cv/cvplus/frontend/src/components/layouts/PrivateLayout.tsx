import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { Header } from '@/components/Header';

export function PrivateLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 safe-top safe-bottom">
        <Outlet />
      </main>
    </div>
  );
}
