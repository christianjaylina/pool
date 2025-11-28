'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, Eye } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Modal, Input } from '@/components/ui';

interface Reservation {
  id: number;
  user: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const mockReservations: Reservation[] = [
  { id: 1, user: 'John Doe', email: 'john@example.com', date: '2025-11-29', start_time: '10:00', end_time: '12:00', guests: 2, status: 'pending', created_at: '2025-11-27' },
  { id: 2, user: 'Jane Smith', email: 'jane@example.com', date: '2025-11-29', start_time: '14:00', end_time: '16:00', guests: 3, status: 'approved', created_at: '2025-11-26' },
  { id: 3, user: 'Bob Wilson', email: 'bob@example.com', date: '2025-11-30', start_time: '09:00', end_time: '11:00', guests: 1, status: 'pending', created_at: '2025-11-27' },
  { id: 4, user: 'Alice Brown', email: 'alice@example.com', date: '2025-11-30', start_time: '15:00', end_time: '17:00', guests: 4, status: 'approved', created_at: '2025-11-25' },
  { id: 5, user: 'Charlie Davis', email: 'charlie@example.com', date: '2025-12-01', start_time: '11:00', end_time: '13:00', guests: 2, status: 'rejected', created_at: '2025-11-26' },
  { id: 6, user: 'Eva Green', email: 'eva@example.com', date: '2025-12-01', start_time: '16:00', end_time: '18:00', guests: 3, status: 'pending', created_at: '2025-11-28' },
  { id: 7, user: 'Frank Miller', email: 'frank@example.com', date: '2025-12-02', start_time: '08:00', end_time: '10:00', guests: 1, status: 'pending', created_at: '2025-11-28' },
  { id: 8, user: 'Grace Lee', email: 'grace@example.com', date: '2025-12-02', start_time: '13:00', end_time: '15:00', guests: 2, status: 'pending', created_at: '2025-11-28' },
];

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const filteredReservations = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter);

  const handleApprove = (id: number) => {
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r)
    );
  };

  const handleReject = () => {
    if (!selectedReservation) return;
    setReservations(prev =>
      prev.map(r => r.id === selectedReservation.id ? { ...r, status: 'rejected' as const } : r)
    );
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedReservation(null);
  };

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 mt-1">
            {pendingCount > 0 ? `${pendingCount} reservations pending approval` : 'All reservations reviewed'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
          const count = status === 'all'
            ? reservations.length
            : reservations.filter(r => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Reservations Table */}
      <Card>
        <Table
          columns={[
            { key: 'user', header: 'User', sortable: true },
            { key: 'date', header: 'Date', sortable: true },
            { 
              key: 'time', 
              header: 'Time', 
              render: (r) => `${r.start_time} - ${r.end_time}` 
            },
            { key: 'guests', header: 'Guests', sortable: true },
            { key: 'status', header: 'Status', render: (r) => getStatusBadge(r.status) },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedReservation(r);
                      setShowDetailModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {r.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success-600 hover:bg-success-50"
                        onClick={() => handleApprove(r.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => {
                          setSelectedReservation(r);
                          setShowRejectModal(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredReservations}
          keyExtractor={(r) => r.id}
          emptyMessage="No reservations found"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Reservation Details"
      >
        {selectedReservation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="font-medium">{selectedReservation.user}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedReservation.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{format(new Date(selectedReservation.date), 'EEEE, MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">{selectedReservation.start_time} - {selectedReservation.end_time}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Guests</p>
                <p className="font-medium">{selectedReservation.guests}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedReservation.status)}
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Requested On</p>
                <p className="font-medium">{format(new Date(selectedReservation.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {selectedReservation.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowRejectModal(true);
                  }}
                >
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleApprove(selectedReservation.id);
                    setShowDetailModal(false);
                  }}
                >
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Reservation"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this reservation.
          </p>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
              Rejection Reason
            </label>
            <textarea
              id="reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Pool maintenance scheduled..."
              className="input-base resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleReject}>
              Reject Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
