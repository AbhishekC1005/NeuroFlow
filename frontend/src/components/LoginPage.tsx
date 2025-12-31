import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import logo from '../assets/image.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/workspace');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-['Outfit',_'Inter',_sans-serif]">
      {/* Top accent bar - Google colors */}
      <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

      <div className="min-h-[calc(100vh-4px)] flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <img src={logo} alt="FlowML" className="h-12 w-auto mx-auto mb-3" />
            <span className="text-2xl font-medium">
              <span className="text-[#4285F4]">Flow</span>
              <span className="text-[#34A853]">ML</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to continue to FlowML</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-[#EA4335] px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#4285F4] hover:text-[#3367D6] font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-8">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <span>←</span> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
