'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Users, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, Badge, Button, Modal, Input, Table } from '@/components/ui';
import { reservationsApi } from '@/lib/api';

interface Reservation {
  reservation_id: number;
  start_time: string;
  end_time: string;
  guests?: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  rejection_reason?: string;
}

// Helper function to convert UTC datetime to Philippines time (UTC+8) and format as 12hr AM/PM
const formatTimeToAMPM = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  // Convert to Philippines time by adding 8 hours to UTC
  const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  const hours = phTime.getUTCHours();
  const minutes = phTime.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to get date in Philippines timezone
const getPhilippinesDate = (dateTimeStr: string): Date => {
  const date = new Date(dateTimeStr);
  // Convert to Philippines time
  return new Date(date.getTime() + (8 * 60 * 60 * 1000));
};

// Helper function to check if a reservation is in the past (using Philippines time)
const isPastReservation = (endTime: string): boolean => {
  // Get current time in Philippines
  const now = new Date();
  const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const phEndTime = getPhilippinesDate(endTime);
  return phEndTime < phNow;
};

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [cancelling, setCancelling] = useState(false);

  // Fetch user's reservations on mount
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        const response = await reservationsApi.getMyReservations();
        setReservations(response.data);
      } catch (err: any) {
        console.error('Error fetching reservations:', err);
        setError(err.response?.data?.message || 'Failed to load reservations');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;
    
    try {
      setCancelling(true);
      await reservationsApi.cancel(selectedReservation.reservation_id);
      // Update local state
      setReservations(prev => 
        prev.map(r => 
          r.reservation_id === selectedReservation.reservation_id 
            ? { ...r, status: 'cancelled' as const }
            : r
        )
      );
      setShowCancelModal(false);
      setSelectedReservation(null);
    } catch (err: any) {
      console.error('Error cancelling reservation:', err);
      alert(err.response?.data?.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string, isPast: boolean = false) => {
    // Show Completed/Expired for past reservations
    if (isPast) {
      if (status === 'approved') {
        return <Badge variant="default">Completed</Badge>;
      }
      if (status === 'pending') {
        return <Badge variant="default">Expired</Badge>;
      }
    }
    
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  // Sort reservations: active first (pending > approved), past at bottom
  const sortedReservations = [...reservations].sort((a, b) => {
    const aPast = isPastReservation(a.end_time);
    const bPast = isPastReservation(b.end_time);
    
    // Past reservations go to bottom
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    
    // If both are past or both are not past, sort by status priority then date
    const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
    const aOrder = statusOrder[a.status] ?? 4;
    const bOrder = statusOrder[b.status] ?? 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Same status, sort by start_time (upcoming first for active, recent first for past)
    if (aPast) {
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    }
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const filteredReservations = filter === 'all' 
    ? sortedReservations 
    : sortedReservations.filter(r => r.status === filter);

  const upcomingReservations = reservations.filter(
    r => r.status === 'approved' && new Date(r.start_time) >= new Date()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-danger-50 border border-danger-200">
        <p className="text-danger-700 font-medium">Error loading reservations</p>
        <p className="text-danger-600 text-sm mt-1">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-gray-500 mt-1">View and manage your pool reservations</p>
        </div>
        <Button onClick={() => window.location.href = '/availability'}>
          New Reservation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['all', 'pending', 'approved', 'cancelled'].map((status) => {
          const count = status === 'all' 
            ? reservations.length 
            : reservations.filter(r => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`p-4 rounded-xl border text-left transition-all ${
                filter === status 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 capitalize">{status === 'all' ? 'Total' : status}</p>
            </button>
          );
        })}
      </div>

      {/* Upcoming Reservations */}
      {upcomingReservations.length > 0 && (
        <Card>
          <CardHeader
            title="Upcoming Reservations"
            subtitle="Your next approved reservations"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingReservations.map((reservation) => (
              <div
                key={reservation.reservation_id}
                className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-primary-50 to-white"
              >
                <div className="flex items-start justify-between mb-3">
                  {getStatusBadge(reservation.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{format(getPhilippinesDate(reservation.start_time), 'EEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{formatTimeToAMPM(reservation.start_time)} - {formatTimeToAMPM(reservation.end_time)}</span>
                  </div>
                  {reservation.guests && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{reservation.guests} guest(s)</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-danger-600 hover:bg-danger-50"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setShowCancelModal(true);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Reservations Table */}
      <Card>
        <CardHeader
          title="Reservation History"
          subtitle={`Showing ${filteredReservations.length} reservations`}
        />
        <Table
          columns={[
            { 
              key: 'date', 
              header: 'Date', 
              sortable: true,
              render: (r) => {
                const isPast = isPastReservation(r.end_time);
                return (
                  <span className={isPast ? 'text-gray-400' : ''}>
                    {format(getPhilippinesDate(r.start_time), 'MMM d, yyyy')}
                  </span>
                );
              }
            },
            { 
              key: 'time', 
              header: 'Time', 
              render: (r) => {
                const isPast = isPastReservation(r.end_time);
                return (
                  <span className={isPast ? 'text-gray-400' : ''}>
                    {formatTimeToAMPM(r.start_time)} - {formatTimeToAMPM(r.end_time)}
                  </span>
                );
              }
            },
            { 
              key: 'guests', 
              header: 'Guests', 
              sortable: true,
              render: (r) => {
                const isPast = isPastReservation(r.end_time);
                return (
                  <div className={`flex items-center gap-1.5 ${isPast ? 'text-gray-400' : ''}`}>
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{r.guests || 1}</span>
                  </div>
                );
              }
            },
            { 
              key: 'status', 
              header: 'Status', 
              render: (r) => {
                const isPast = isPastReservation(r.end_time);
                return getStatusBadge(r.status, isPast);
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => {
                // If past reservation, show dash
                if (isPastReservation(r.end_time)) {
                  return <span className="text-sm text-gray-400">-</span>;
                }
                
                // For future reservations, show cancel option
                if (r.status === 'pending' || r.status === 'approved') {
                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReservation(r);
                          setShowCancelModal(true);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  );
                }
                
                // For rejected reservations, show reason if available
                if (r.rejection_reason) {
                  return <span className="text-sm text-gray-500">{r.rejection_reason}</span>;
                }
                
                return <span className="text-sm text-gray-400">-</span>;
              },
            },
          ]}
          data={filteredReservations}
          keyExtractor={(r) => r.reservation_id}
          emptyMessage="No reservations found"
          rowClassName={(r) => isPastReservation(r.end_time) ? 'bg-gray-50' : ''}
        />
      </Card>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Reservation"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel this reservation?
          </p>
          {selectedReservation && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
              <p><strong>Date:</strong> {format(getPhilippinesDate(selectedReservation.start_time), 'EEEE, MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {formatTimeToAMPM(selectedReservation.start_time)} - {formatTimeToAMPM(selectedReservation.end_time)}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>
              Keep Reservation
            </Button>
            <Button 
              variant="danger" 
              className="flex-1"
              onClick={handleCancelReservation}
              loading={cancelling}
            >
              Cancel Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
