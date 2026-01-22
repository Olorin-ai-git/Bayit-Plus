import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { GlassButton } from '@/components/glass';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="safe-top safe-left safe-right border-b border-gray-800 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/upload" className="flex items-center">
            <span className="text-2xl font-bold">CVPlus</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/upload" className="hover:text-blue-400 transition-colors">
              New CV
            </Link>
            <Link to="/dashboard" className="hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/pricing" className="hover:text-blue-400 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="hidden md:inline text-gray-400">
                  {user.email}
                </span>
                <GlassButton variant="outline" size="sm" onClick={logout}>
                  Logout
                </GlassButton>
              </>
            ) : (
              <GlassButton variant="primary" size="sm">
                Login
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
