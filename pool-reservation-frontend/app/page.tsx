'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Waves, Calendar, Clock, CheckCircle, CalendarDays, History, MessageSquare, LogOut, User, Droplets, Sun, Shield, Users, Sparkles, ThermometerSun, Wifi, ParkingCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const poolImages = [
    { src: '/images/1.jpg', alt: 'Luxuria Bacaca Resort Swimming Pool - View 1' },
    { src: '/images/2.jpg', alt: 'Luxuria Bacaca Resort Swimming Pool - View 2' },
  ];

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % poolImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [poolImages.length]);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (!isLoading && user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [user, isLoading, router]);

  // Don't render user homepage for admins
  if (!isLoading && user?.role === 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800">
      {/* Navigation */}
      <nav className="px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/images/logo/logo.png"
              alt="Luxuria Bacaca Resort Logo"
              width={45}
              height={45}
              className="rounded-xl w-9 h-9 sm:w-[45px] sm:h-[45px]"
            />
            <span className="text-lg sm:text-xl font-bold text-white hidden xs:inline">Luxuria Bacaca Resort</span>
            <span className="text-lg font-bold text-white xs:hidden">Luxuria</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {isLoading ? (
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
            ) : user ? (
              <>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-white/10 rounded-lg">
                  <User className="h-4 w-4 text-white/80" />
                  <span className="text-xs sm:text-sm font-medium text-white">
                    <span className="hidden sm:inline">Hi, </span>{user.fName}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-white text-primary-700 rounded-lg hover:bg-white/90 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {user ? `Welcome back, ${user.fName}!` : 'Reserve Your Pool Time with Ease'}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8">
              {user 
                ? 'What would you like to do today? Choose from the options below to manage your pool reservations.'
                : 'The simple and efficient way for apartment residents to book pool access. View availability, make reservations, and enjoy your swim time hassle-free.'
              }
            </p>
            {!user && (
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
            )}
          </div>

          {/* User Quick Actions - Only shown when logged in */}
          {user && (
            <div className="mt-12 grid sm:grid-cols-3 gap-6">
              {/* Book a Pool - Primary Action */}
              <Link
                href="/availability"
                className="group relative bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30 hover:border-cyan-400/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] cursor-pointer overflow-hidden"
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 to-cyan-400/0 group-hover:from-cyan-400/10 group-hover:to-blue-500/10 transition-all duration-500" />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-cyan-400/40 group-hover:scale-110 transition-all duration-300">
                    <CalendarDays className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">Book a Pool</h3>
                  <p className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
                    View availability and make a new reservation for pool access.
                  </p>
                  
                  {/* Click indicator */}
                  <div className="mt-4 flex items-center gap-2 text-cyan-300 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span>Reserve Now</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* My Reservations */}
              <Link
                href="/my-reservations"
                className="group relative bg-gradient-to-br from-violet-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-violet-400/30 hover:border-violet-400/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(167,139,250,0.3)] cursor-pointer overflow-hidden"
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-400/0 to-violet-400/0 group-hover:from-violet-400/10 group-hover:to-purple-500/10 transition-all duration-500" />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-violet-400/40 group-hover:scale-110 transition-all duration-300">
                    <History className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-200 transition-colors">My Reservations</h3>
                  <p className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
                    View and manage your upcoming and past pool reservations.
                  </p>
                  
                  {/* Click indicator */}
                  <div className="mt-4 flex items-center gap-2 text-violet-300 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span>View History</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Feedback */}
              <Link
                href="/feedback"
                className="group relative bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/30 hover:border-amber-400/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(251,191,36,0.3)] cursor-pointer overflow-hidden"
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-amber-400/0 group-hover:from-amber-400/10 group-hover:to-orange-500/10 transition-all duration-500" />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-amber-400/40 group-hover:scale-110 transition-all duration-300">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-200 transition-colors">Feedback</h3>
                  <p className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
                    Share your experience and help us improve our service.
                  </p>
                  
                  {/* Click indicator */}
                  <div className="mt-4 flex items-center gap-2 text-amber-300 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span>Send Feedback</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Pool Showcase Section */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Luxuria Bacaca Resort
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Experience relaxation and recreation at our swimming pool with modern amenities designed for your comfort.
              </p>
            </div>

            {/* Pool Image Carousel */}
            <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/20 shadow-2xl group">
              <div className="aspect-[21/9] relative">
                {poolImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                {/* Navigation Arrows */}
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + poolImages.length) % poolImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % poolImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                {/* Content Overlay */}
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-2xl font-bold">Crystal Clear Swimming Pool</p>
                  <p className="text-white/80 text-sm mt-1">Temperature Controlled • Open Daily</p>
                </div>
                
                {/* Dot Indicators */}
                <div className="absolute bottom-6 right-6 flex gap-2">
                  {poolImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        index === currentImageIndex 
                          ? 'bg-white w-8' 
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Pool Amenities */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-16 h-16 mx-auto bg-cyan-400/20 rounded-2xl flex items-center justify-center mb-4">
                  <Droplets className="h-8 w-8 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Crystal Clear Water</h3>
                <p className="text-white/60 text-sm">
                  Advanced filtration system ensures pristine, clean water at all times.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-16 h-16 mx-auto bg-yellow-400/20 rounded-2xl flex items-center justify-center mb-4">
                  <ThermometerSun className="h-8 w-8 text-yellow-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Heated Pool</h3>
                <p className="text-white/60 text-sm">
                  Temperature-controlled water for year-round swimming comfort.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-16 h-16 mx-auto bg-green-400/20 rounded-2xl flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-green-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Lifeguard On Duty</h3>
                <p className="text-white/60 text-sm">
                  Trained lifeguards ensure your safety during pool hours.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-16 h-16 mx-auto bg-orange-400/20 rounded-2xl flex items-center justify-center mb-4">
                  <Sun className="h-8 w-8 text-orange-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Sun Deck Area</h3>
                <p className="text-white/60 text-sm">
                  Spacious lounging area with comfortable sun beds and umbrellas.
                </p>
              </div>
            </div>

            {/* Additional Facilities */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white text-center mb-8">Additional Facilities</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Capacity: 50</h4>
                    <p className="text-white/50 text-sm">Maximum swimmers</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">6 AM - 10 PM</h4>
                    <p className="text-white/50 text-sm">Operating hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wifi className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Free WiFi</h4>
                    <p className="text-white/50 text-sm">Poolside connectivity</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ParkingCircle className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Free Parking</h4>
                    <p className="text-white/50 text-sm">Convenient access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features - System benefits */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Why Choose Our Reservation System?
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Simple, fast, and convenient pool booking at your fingertips.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* CTA for non-logged in users */}
          {!user && (
            <div className="mt-20 text-center bg-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Dive In?</h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Join our community today and start enjoying hassle-free pool reservations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-3 text-lg font-medium bg-white text-primary-700 rounded-xl hover:bg-white/90 transition-colors"
                >
                  Create An Account
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3 text-lg font-medium border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  Already a Member?
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-white/60 text-sm">
          © 2025 Luxuria Bacaca Resort. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
