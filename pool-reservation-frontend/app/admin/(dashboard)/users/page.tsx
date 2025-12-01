'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { UserCheck, UserX, Search, RefreshCw, Users, Pencil } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Modal, Input, StatCard } from '@/components/ui';
import { usersApi } from '@/lib/api';

interface User {
  user_id: number;
  fName: string;
  lName: string;
  email: string;
  is_active: boolean;
  max_guests: number | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Max guests modal state
  const [showMaxGuestsModal, setShowMaxGuestsModal] = useState(false);
  const [maxGuestsValue, setMaxGuestsValue] = useState<string>('');
  const [maxGuestsLoading, setMaxGuestsLoading] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ fName: '', lName: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
    .filter(u => {
      if (filter === 'active') return u.is_active;
      if (filter === 'inactive') return !u.is_active;
      return true;
    })
    .filter(u => 
      u.fName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  const toggleUserStatus = (user: User) => {
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const openMaxGuestsModal = (user: User) => {
    setSelectedUser(user);
    if (user.max_guests === null) {
      setIsUnlimited(true);
      setMaxGuestsValue('');
    } else {
      setIsUnlimited(false);
      setMaxGuestsValue(user.max_guests.toString());
    }
    setShowMaxGuestsModal(true);
  };

  const handleSetMaxGuests = async () => {
    if (!selectedUser) return;
    
    setMaxGuestsLoading(true);
    try {
      const maxGuests = isUnlimited ? null : parseInt(maxGuestsValue) || 1;
      await usersApi.setMaxGuests(selectedUser.user_id, maxGuests);
      await fetchUsers();
      setShowMaxGuestsModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error setting max guests:', error);
    } finally {
      setMaxGuestsLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      fName: user.fName,
      lName: user.lName,
      email: user.email
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    if (!editForm.fName.trim() || !editForm.lName.trim() || !editForm.email.trim()) {
      setEditError('All fields are required.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      setEditError('Please enter a valid email address.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      await usersApi.updateUserInfo(selectedUser.user_id, editForm);
      await fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      setEditError(error.response?.data?.message || 'Failed to update user information.');
    } finally {
      setEditLoading(false);
    }
  };

  const confirmToggle = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(selectedUser.user_id);
      // Toggle the is_active status
      await usersApi.toggleActive(selectedUser.user_id, !selectedUser.is_active);
      // Refresh users list
      await fetchUsers();
      setShowConfirmModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error toggling user status:', error);
    } finally {
      setActionLoading(null);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-500 mt-1">View and manage renter accounts</p>
        </div>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={users.length}
          icon={UserCheck}
          color="primary"
        />
        <StatCard
          title="Active Users"
          value={activeCount}
          icon={UserCheck}
          color="success"
        />
        <StatCard
          title="Inactive Users"
          value={inactiveCount}
          icon={UserX}
          color="danger"
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <Table
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (u) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {u.fName[0]}{u.lName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.fName} {u.lName}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
              ),
            },
            { 
              key: 'created_at', 
              header: 'Joined', 
              sortable: true,
              render: (u) => format(new Date(u.created_at), 'MMM d, yyyy')
            },
            {
              key: 'is_active',
              header: 'Status',
              render: (u) => (
                <Badge variant={u.is_active ? 'success' : 'danger'}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              key: 'max_guests',
              header: 'Max Guests',
              render: (u) => (
                <button
                  onClick={() => openMaxGuestsModal(u)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                  title="Click to edit"
                >
                  <Users className="h-3.5 w-3.5 text-gray-500" />
                  <span className="font-medium">
                    {u.max_guests === null ? 'Unlimited' : u.max_guests}
                  </span>
                </button>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (u) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-600 hover:bg-primary-50"
                    onClick={() => openEditModal(u)}
                    title="Edit User"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={u.is_active ? 'text-danger-600 hover:bg-danger-50' : 'text-success-600 hover:bg-success-50'}
                    onClick={() => toggleUserStatus(u)}
                    loading={actionLoading === u.user_id}
                  >
                    {u.is_active ? (
                      <>
                        <UserX className="h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              ),
            },
          ]}
          data={filteredUsers}
          keyExtractor={(u) => u.user_id}
          emptyMessage="No users found"
        />
      </Card>

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to {selectedUser.is_active ? 'deactivate' : 'activate'}{' '}
              <strong>{selectedUser.fName} {selectedUser.lName}</strong>?
            </p>
            {selectedUser.is_active && (
              <div className="p-3 bg-warning-50 rounded-lg text-warning-700 text-sm">
                Deactivating this user will prevent them from making new reservations and logging in.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button
                variant={selectedUser.is_active ? 'danger' : 'primary'}
                className="flex-1"
                onClick={confirmToggle}
                loading={actionLoading === selectedUser.user_id}
              >
                {selectedUser.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Max Guests Modal */}
      <Modal
        isOpen={showMaxGuestsModal}
        onClose={() => setShowMaxGuestsModal(false)}
        title="Set Maximum Guests"
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Set the maximum number of guests that <strong>{selectedUser.fName} {selectedUser.lName}</strong> can include in a single reservation.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => setIsUnlimited(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Unlimited (no restriction)</span>
              </label>
              
              {!isUnlimited && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Maximum Guests per Reservation
                  </label>
                  <input
                    type="number"
                    value={maxGuestsValue}
                    onChange={(e) => setMaxGuestsValue(e.target.value)}
                    min="1"
                    max="100"
                    placeholder="Enter max guests..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
              <strong>Note:</strong> When the user makes a reservation, they won&apos;t be able to enter more guests than this limit.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowMaxGuestsModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSetMaxGuests}
                loading={maxGuestsLoading}
                disabled={!isUnlimited && (!maxGuestsValue || parseInt(maxGuestsValue) < 1)}
              >
                Save Limit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User Information"
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Update account information for <strong>{selectedUser.fName} {selectedUser.lName}</strong>
            </p>

            {editError && (
              <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-sm">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={editForm.fName}
                onChange={(e) => setEditForm(prev => ({ ...prev, fName: e.target.value }))}
                placeholder="First name"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={editForm.lName}
                onChange={(e) => setEditForm(prev => ({ ...prev, lName: e.target.value }))}
                placeholder="Last name"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
              <strong>Note:</strong> If you change the email, the user will need to use the new email to log in.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleEditUser}
                loading={editLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
