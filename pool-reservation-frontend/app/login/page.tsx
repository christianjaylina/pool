'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inactivityMessage, setInactivityMessage] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check if redirected due to inactivity
  useEffect(() => {
    if (searchParams.get('reason') === 'inactivity') {
      setInactivityMessage(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md" padding="lg">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 mt-2">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {inactivityMessage && (
          <div className="p-3 rounded-lg bg-warning-50 text-warning-700 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>You were logged out due to 15 minutes of inactivity. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-danger-50 text-danger-600 text-sm">
            {error}
          </div>
        )}

        <Input
          id="email"
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link 
            href="/forgot-password" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700">
            Register here
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Image
            src="/images/logo/logo.png"
            alt="Luxuria Bacaca Resort Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="font-semibold text-gray-900">Luxuria Bacaca Resort</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={
          <Card className="w-full max-w-md" padding="lg">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
              </div>
            </div>
          </Card>
        }>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
