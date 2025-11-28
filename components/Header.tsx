'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <span className="text-white text-xl font-bold">JS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Jeonse Safety
                </h1>
                <p className="text-xs text-gray-500 font-medium">Checker</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Home
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  My Analyses
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Profile
                </Link>
                <div className="w-px h-6 bg-gray-200 mx-2"></div>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                {!isLoading && (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                      Log In
                    </Link>
                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                    <Link
                      href="/auth/signup"
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transition-all hover:scale-105"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200/50 py-4 space-y-2">
            <Link
              href="/"
              className="block text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Analyses
                </Link>
                <Link
                  href="/profile"
                  className="block text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                {!isLoading && (
                  <>
                    <Link
                      href="/auth/login"
                      className="block text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 text-center transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
