'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, Eye, EyeOff, Clock } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
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
      if (response.data.user.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" padding="lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 mt-2">Access the administration panel</p>
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
              label="Admin Email"
              placeholder="admin@example.com"
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

            <Button type="submit" className="w-full" loading={loading}>
              Sign In to Admin Panel
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to User Login
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
