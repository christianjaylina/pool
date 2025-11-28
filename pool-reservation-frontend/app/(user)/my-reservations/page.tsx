'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Users, X, RotateCcw } from 'lucide-react';
import { Card, CardHeader, Badge, Button, Modal, Input, Table } from '@/components/ui';

interface Reservation {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  rejection_reason?: string;
}

// Mock data - in real app, fetch from API
const mockReservations: Reservation[] = [
  {
    id: 1,
    date: '2025-11-29',
    start_time: '10:00',
    end_time: '12:00',
    guests: 2,
    status: 'approved',
    created_at: '2025-11-27',
  },
  {
    id: 2,
    date: '2025-11-30',
    start_time: '14:00',
    end_time: '16:00',
    guests: 3,
    status: 'pending',
    created_at: '2025-11-28',
  },
  {
    id: 3,
    date: '2025-11-25',
    start_time: '09:00',
    end_time: '11:00',
    guests: 1,
    status: 'rejected',
    created_at: '2025-11-24',
    rejection_reason: 'Pool maintenance scheduled',
  },
  {
    id: 4,
    date: '2025-11-20',
    start_time: '15:00',
    end_time: '17:00',
    guests: 4,
    status: 'cancelled',
    created_at: '2025-11-18',
  },
];

export default function MyReservationsPage() {
  const [reservations] = useState<Reservation[]>(mockReservations);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const filteredReservations = filter === 'all' 
    ? reservations 
    : reservations.filter(r => r.status === filter);

  const upcomingReservations = reservations.filter(
    r => r.status === 'approved' && new Date(r.date) >= new Date()
  );

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
                key={reservation.id}
                className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-primary-50 to-white"
              >
                <div className="flex items-start justify-between mb-3">
                  {getStatusBadge(reservation.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{format(new Date(reservation.date), 'EEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{reservation.start_time} - {reservation.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{reservation.guests} guest(s)</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setShowRescheduleModal(true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reschedule
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-600 hover:bg-danger-50"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setShowCancelModal(true);
                    }}
                  >
                    <X className="h-4 w-4" />
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
            { key: 'date', header: 'Date', sortable: true },
            { key: 'time', header: 'Time', render: (r) => `${r.start_time} - ${r.end_time}` },
            { key: 'guests', header: 'Guests', sortable: true },
            { key: 'status', header: 'Status', render: (r) => getStatusBadge(r.status) },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                r.status === 'pending' || r.status === 'approved' ? (
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
                ) : r.rejection_reason ? (
                  <span className="text-sm text-gray-500">{r.rejection_reason}</span>
                ) : null
              ),
            },
          ]}
          data={filteredReservations}
          keyExtractor={(r) => r.id}
          emptyMessage="No reservations found"
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
              <p><strong>Date:</strong> {format(new Date(selectedReservation.date), 'EEEE, MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {selectedReservation.start_time} - {selectedReservation.end_time}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>
              Keep Reservation
            </Button>
            <Button variant="danger" className="flex-1">
              Cancel Reservation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Reservation"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Select a new date and time for your reservation.
          </p>
          <Input type="date" label="New Date" />
          <div className="grid grid-cols-2 gap-4">
            <Input type="time" label="Start Time" />
            <Input type="time" label="End Time" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1">
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
