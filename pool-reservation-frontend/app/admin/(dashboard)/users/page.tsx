'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { UserCheck, UserX, Search, Mail } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Modal, Input, StatCard } from '@/components/ui';

interface User {
  id: number;
  fName: string;
  lName: string;
  email: string;
  is_active: boolean;
  created_at: string;
  reservations_count: number;
}

const mockUsers: User[] = [
  { id: 1, fName: 'John', lName: 'Doe', email: 'john@example.com', is_active: true, created_at: '2025-10-15', reservations_count: 12 },
  { id: 2, fName: 'Jane', lName: 'Smith', email: 'jane@example.com', is_active: true, created_at: '2025-10-20', reservations_count: 8 },
  { id: 3, fName: 'Bob', lName: 'Wilson', email: 'bob@example.com', is_active: false, created_at: '2025-11-01', reservations_count: 3 },
  { id: 4, fName: 'Alice', lName: 'Brown', email: 'alice@example.com', is_active: true, created_at: '2025-11-05', reservations_count: 15 },
  { id: 5, fName: 'Charlie', lName: 'Davis', email: 'charlie@example.com', is_active: true, created_at: '2025-11-10', reservations_count: 6 },
  { id: 6, fName: 'Eva', lName: 'Green', email: 'eva@example.com', is_active: false, created_at: '2025-11-12', reservations_count: 2 },
  { id: 7, fName: 'Frank', lName: 'Miller', email: 'frank@example.com', is_active: true, created_at: '2025-11-18', reservations_count: 4 },
  { id: 8, fName: 'Grace', lName: 'Lee', email: 'grace@example.com', is_active: true, created_at: '2025-11-22', reservations_count: 1 },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const confirmToggle = () => {
    if (!selectedUser) return;
    setUsers(prev =>
      prev.map(u => u.id === selectedUser.id ? { ...u, is_active: !u.is_active } : u)
    );
    setShowConfirmModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500 mt-1">View and manage renter accounts</p>
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
              key: 'reservations_count', 
              header: 'Reservations', 
              sortable: true,
              render: (u) => <span className="text-gray-600">{u.reservations_count}</span>
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
              key: 'actions',
              header: 'Actions',
              render: (u) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={u.is_active ? 'text-danger-600 hover:bg-danger-50' : 'text-success-600 hover:bg-success-50'}
                    onClick={() => toggleUserStatus(u)}
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
          keyExtractor={(u) => u.id}
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
              >
                {selectedUser.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
