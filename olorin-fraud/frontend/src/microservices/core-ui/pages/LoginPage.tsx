import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { getDefaultRouteForRole } from '../config/route-permissions';

/**
 * Login page with Google Sign-In and email/password options.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmailPassword, user, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect path from location state or use default
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const redirectTo = from || getDefaultRouteForRole(user.role);
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, from, navigate]);

  const handleGoogleSuccess = () => {
    // Navigation handled by useEffect above
  };

  const handleGoogleError = (err: Error) => {
    setError(err.message || 'Google sign-in failed. Please try again.');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithEmailPassword(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Olorin</h1>
          <p className="mt-2 text-gray-400">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-xl shadow-xl p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign-In */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            fullWidth
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800 text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600
                         rounded-lg text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600
                         rounded-lg text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700
                       text-white font-medium rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
