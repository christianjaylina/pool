'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api';

type Step = 'info' | 'verify' | 'password' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('info');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [formData, setFormData] = useState({
    fName: '',
    lName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const chars = value.slice(0, 6).split('');
      const newCode = [...verificationCode];
      chars.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else if (/^\d$/.test(value) || value === '') {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Submit basic info and send verification code
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fName || !formData.lName || !formData.email) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await authApi.sendVerification({ email: formData.email, fName: formData.fName });
      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify email code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail({ email: formData.email, code });
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password and complete registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        fName: formData.fName,
        lName: formData.lName,
        email: formData.email,
        password: formData.password,
      });
      setStep('success');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setLoading(true);
    try {
      await authApi.sendVerification({ email: formData.email, fName: formData.fName });
      setResendCooldown(60);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center" padding="lg">
          <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-500">Redirecting you to login...</p>
        </Card>
      </div>
    );
  }

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
        <Card className="w-full max-w-md" padding="lg">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['info', 'verify', 'password'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-primary-500 text-white' :
                  ['info', 'verify', 'password'].indexOf(step) > i ? 'bg-success-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {['info', 'verify', 'password'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${['info', 'verify', 'password'].indexOf(step) > i ? 'bg-success-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 'info' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
                <p className="text-gray-500 mt-2">Enter your details to get started</p>
              </div>

              <form onSubmit={handleSendVerification} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-danger-50 text-danger-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="fName"
                    label="First Name"
                    placeholder="Juan"
                    value={formData.fName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fName: e.target.value })}
                    required
                  />
                  <Input
                    id="lName"
                    label="Last Name"
                    placeholder="Dela Cruz"
                    value={formData.lName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lName: e.target.value })}
                    required
                  />
                </div>

                <Input
                  id="email"
                  type="email"
                  label="Email Address"
                  placeholder="juandelacruz@example.com"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                  helperText="We'll send a verification code to this email"
                  required
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Send Verification Code
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Email Verification */}
          {step === 'verify' && (
            <>
              <button
                type="button"
                onClick={() => setStep('info')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
                <p className="text-gray-500 mt-2">
                  We sent a 6-digit code to<br />
                  <span className="font-medium text-gray-900">{formData.email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-danger-50 text-danger-600 text-sm">
                    {error}
                  </div>
                )}

                {/* 6-digit code input */}
                <div className="flex justify-center gap-2">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  ))}
                </div>

                <Button type="submit" className="w-full" loading={loading}>
                  Verify Email
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Didn&apos;t receive the code?{' '}
                    {resendCooldown > 0 ? (
                      <span className="text-gray-400">Resend in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-1"
                        disabled={loading}
                      >
                        <RefreshCw className="h-3 w-3" /> Resend code
                      </button>
                    )}
                  </p>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Set Password */}
          {step === 'password' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-success-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Email verified!</h1>
                <p className="text-gray-500 mt-2">Now create a password for your account</p>
              </div>

              <form onSubmit={handleCompleteRegistration} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-danger-50 text-danger-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    helperText="Must be at least 6 characters"
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

                <Input
                  id="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Create Account
                </Button>
              </form>
            </>
          )}

          {step === 'info' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
