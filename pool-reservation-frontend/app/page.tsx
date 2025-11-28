import Link from 'next/link';
import { Waves, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Waves className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">PoolRes</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-white text-primary-700 rounded-lg hover:bg-white/90 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Reserve Your Pool Time with Ease
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8">
              The simple and efficient way for apartment residents to book pool access. 
              View availability, make reservations, and enjoy your swim time hassle-free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-3 text-lg font-medium bg-white text-primary-700 rounded-xl hover:bg-white/90 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 text-lg font-medium border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Easy Scheduling</h3>
              <p className="text-white/70">
                View pool availability at a glance with our intuitive calendar interface.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Flexible Time Slots</h3>
              <p className="text-white/70">
                Choose from various time slots that fit your schedule perfectly.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Instant Confirmation</h3>
              <p className="text-white/70">
                Get real-time updates on your reservation status via notifications.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-white/60 text-sm">
          © 2025 Pool Reservation System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
