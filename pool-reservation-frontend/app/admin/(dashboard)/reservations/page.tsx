'use client';

import { useState, useEffect } from 'react';
import { format, isPast } from 'date-fns';
import { Check, X, RefreshCw, Ban, Users, Plus, Clock } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Modal } from '@/components/ui';
import { reservationsApi, usersApi } from '@/lib/api';

// Format timestamp - DB returns timestamps in PHT (UTC+8)
// We append +08:00 to tell JavaScript the timestamp is in PHT
const formatPHDateTime = (dateString: string, formatStr: 'date' | 'time' | 'both') => {
  // If the string doesn't have timezone info, treat it as PHT
  let dateStr = dateString;
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Convert "2025-12-09 08:49:00" to "2025-12-09T08:49:00+08:00"
    dateStr = dateString.replace(' ', 'T') + '+08:00';
  }
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Manila' };
  
  if (formatStr === 'date' || formatStr === 'both') {
    options.month = 'short';
    options.day = 'numeric';
    options.year = 'numeric';
  }
  if (formatStr === 'time' || formatStr === 'both') {
    options.hour = 'numeric';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return date.toLocaleString('en-US', options);
};

interface Reservation {
  reservation_id: number;
  user_id: number;
  fName: string;
  lName: string;
  email: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

interface User {
  user_id: number;
  fName: string;
  lName: string;
  email: string;
  is_active: boolean;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Create reservation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: '',
    date: '',
    startTime: '',
    endTime: '',
    guests: 1
  });
  const [createError, setCreateError] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      // Fetch all reservations for admin
      const response = await reservationsApi.getAll();
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersApi.getAll();
      // Filter only active users
      setUsers(response.data.filter((u: User) => u.is_active));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setCreateError('');
    setCreateForm({
      userId: '',
      date: '',
      startTime: '',
      endTime: '',
      guests: 1
    });
    await fetchUsers();
  };

  const handleCreateReservation = async () => {
    if (!createForm.userId || !createForm.date || !createForm.startTime || !createForm.endTime) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    
    setCreateLoading(true);
    setCreateError('');
    try {
      await reservationsApi.adminCreate({
        userId: parseInt(createForm.userId),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        guests: createForm.guests
      });
      setShowCreateModal(false);
      await fetchReservations();
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Failed to create reservation.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Generate time slots (8:00 AM - 8:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      const value = `${hour.toString().padStart(2, '0')}:00`;
      const displayHour = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const label = `${displayHour}:00 ${period}`;
      slots.push({ value, label });
    }
    return slots;
  };

  // Get today's date for min date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Check if a reservation is in the past
  const isReservationPast = (endTime: string) => {
    return isPast(new Date(endTime));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  // Filter reservations by status, then sort: active first (pending > approved > rejected > cancelled), past at bottom
  const filteredReservations = (filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter)
  ).sort((a, b) => {
    const aPast = isReservationPast(a.end_time);
    const bPast = isReservationPast(b.end_time);
    
    // Past reservations go to bottom
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    
    // If both are past or both are not past, sort by status priority then created_at
    if (aPast === bPast) {
      const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
      const aOrder = statusOrder[a.status] ?? 4;
      const bOrder = statusOrder[b.status] ?? 4;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Same status, sort by created_at (earliest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    return 0;
  });

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await reservationsApi.approve(id);
      // Refresh data after action
      await fetchReservations();
    } catch (error) {
      console.error('Error approving reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(selectedReservation.reservation_id);
      await reservationsApi.reject(selectedReservation.reservation_id, rejectReason);
      // Refresh data after action
      await fetchReservations();
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedReservation(null);
    } catch (error) {
      console.error('Error rejecting reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!selectedReservation || !cancelReason.trim()) return;
    try {
      setActionLoading(selectedReservation.reservation_id);
      await reservationsApi.adminCancel(selectedReservation.reservation_id, cancelReason);
      // Refresh data after action
      await fetchReservations();
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedReservation(null);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = reservations.filter(r => r.status === 'pending' && !isReservationPast(r.end_time)).length;

  // Helper to format time to AM/PM
  const formatTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Helper to format date
  const formatDate = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return format(date, 'MMM d, yyyy');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Reservation
          </Button>
          <Button variant="outline" onClick={fetchReservations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
            { 
              key: 'user', 
              header: 'User', 
              sortable: true,
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <span className={past ? 'line-through text-gray-400' : ''}>
                    {r.fName} {r.lName}
                  </span>
                );
              }
            },
            { 
              key: 'date', 
              header: 'Date', 
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <span className={past ? 'line-through text-gray-400' : ''}>
                    {formatDate(r.start_time)}
                  </span>
                );
              }
            },
            { 
              key: 'time', 
              header: 'Time', 
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <span className={past ? 'line-through text-gray-400' : ''}>
                    {formatTime(r.start_time)} - {formatTime(r.end_time)}
                  </span>
                );
              }
            },
            { 
              key: 'guests', 
              header: 'Guests', 
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <div className={`flex items-center gap-1.5 ${past ? 'text-gray-400' : ''}`}>
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{r.guests || 1}</span>
                  </div>
                );
              }
            },
            { 
              key: 'email', 
              header: 'Email', 
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <span className={past ? 'line-through text-gray-400' : 'text-gray-600'}>
                    {r.email}
                  </span>
                );
              }
            },
            { 
              key: 'created_at', 
              header: 'Requested At', 
              sortable: true,
              render: (r) => {
                const past = isReservationPast(r.end_time);
                return (
                  <div className={`flex items-center gap-1.5 ${past ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {formatPHDateTime(r.created_at, 'date')}<br />
                      {formatPHDateTime(r.created_at, 'time')}
                    </span>
                  </div>
                );
              }
            },
            { 
              key: 'status', 
              header: 'Status', 
              render: (r) => {
                const past = isReservationPast(r.end_time);
                if (past && r.status === 'approved') {
                  return <Badge variant="default">Completed</Badge>;
                }
                if (past && r.status === 'pending') {
                  return <Badge variant="default">Expired</Badge>;
                }
                return getStatusBadge(r.status);
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => {
                const past = isReservationPast(r.end_time);
                
                // No actions for past reservations
                if (past) {
                  return <span className="text-gray-400 text-sm">-</span>;
                }
                
                // Show actions for pending reservations
                if (r.status === 'pending') {
                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success-600 hover:bg-success-50"
                        onClick={() => handleApprove(r.reservation_id)}
                        loading={actionLoading === r.reservation_id}
                        title="Approve"
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
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
                
                // Show cancel action for approved reservations
                if (r.status === 'approved') {
                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => {
                          setSelectedReservation(r);
                          setShowCancelModal(true);
                        }}
                        loading={actionLoading === r.reservation_id}
                        title="Cancel Reservation"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
                
                return <span className="text-gray-400 text-sm">-</span>;
              },
            },
          ]}
          data={filteredReservations}
          keyExtractor={(r) => r.reservation_id}
          emptyMessage="No reservations found"
        />
      </Card>

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
            <Button 
              variant="danger" 
              className="flex-1" 
              onClick={handleReject}
              loading={actionLoading === selectedReservation?.reservation_id}
            >
              Reject Reservation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Approved Reservation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
        title="Cancel Approved Reservation"
      >
        <div className="space-y-4">
          {selectedReservation && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Guest:</strong> {selectedReservation.fName} {selectedReservation.lName}</p>
              <p><strong>Date:</strong> {formatDate(selectedReservation.start_time)}</p>
              <p><strong>Time:</strong> {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}</p>
              <p><strong>Total Guests:</strong> {selectedReservation.guests || 1}</p>
            </div>
          )}
          <p className="text-gray-600">
            This reservation has already been approved. The guest will be notified of the cancellation with the reason you provide.
          </p>
          <div>
            <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1.5">
              Cancellation Reason <span className="text-danger-500">*</span>
            </label>
            <textarea
              id="cancelReason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Emergency pool maintenance required, Private event booking..."
              className="input-base resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
            >
              Go Back
            </Button>
            <Button 
              variant="danger" 
              className="flex-1" 
              onClick={handleCancel}
              loading={actionLoading === selectedReservation?.reservation_id}
              disabled={!cancelReason.trim()}
            >
              Cancel Reservation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Reservation Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Reservation"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Create a reservation on behalf of a user. The reservation will be automatically approved.
          </p>

          {createError && (
            <div className="bg-danger-50 text-danger-700 p-3 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select User <span className="text-danger-500">*</span>
            </label>
            <select
              value={createForm.userId}
              onChange={(e) => setCreateForm(prev => ({ ...prev, userId: e.target.value }))}
              disabled={loadingUsers}
              className="input-base"
            >
              <option value="">
                {loadingUsers ? 'Loading users...' : '-- Select a user --'}
              </option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.fName} {user.lName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date <span className="text-danger-500">*</span>
            </label>
            <input
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
              min={getTodayDate()}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Time <span className="text-danger-500">*</span>
              </label>
              <select
                value={createForm.startTime}
                onChange={(e) => {
                  const startHour = parseInt(e.target.value.split(':')[0]);
                  const endHour = startHour + 1;
                  setCreateForm(prev => ({
                    ...prev,
                    startTime: e.target.value,
                    endTime: endHour <= 20 ? `${endHour.toString().padStart(2, '0')}:00` : prev.endTime
                  }));
                }}
                className="input-base"
              >
                <option value="">-- Select --</option>
                {generateTimeSlots().slice(0, -1).map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Time <span className="text-danger-500">*</span>
              </label>
              <select
                value={createForm.endTime}
                onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                className="input-base"
              >
                <option value="">-- Select --</option>
                {generateTimeSlots().slice(1).map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Number of Guests
            </label>
            <input
              type="number"
              value={createForm.guests}
              onChange={(e) => setCreateForm(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
              min="1"
              max="50"
              className="input-base"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreateReservation}
              loading={createLoading}
            >
              Create Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
