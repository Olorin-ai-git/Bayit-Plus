/**
 * Beta 500 Admin Dashboard
 *
 * Comprehensive admin interface for managing Beta 500 users:
 * - List all beta users with filters
 * - View credit balances and usage
 * - Manually adjust credits
 * - Deactivate/reactivate beta access
 * - View analytics
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassTextArea,
  GlassCheckbox,
  GlassSelect,
  GlassModal,
  GlassAlert,
  GlassBadge,
} from '@olorin/glass-ui';
import { useTranslation } from 'react-i18next';

// Types
interface BetaUser {
  user_id: string;
  email: string;
  name?: string;
  status: string;
  is_beta_user: boolean;
  credits_remaining: number;
  credits_total: number;
  credits_used: number;
  enrolled_at: string;
  last_activity?: string;
}

interface CreditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: BetaUser | null;
  onSuccess: () => void;
}

// Credit Adjustment Modal Component
const CreditAdjustmentModal: React.FC<CreditAdjustmentModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notifyUser, setNotifyUser] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !reason || reason.length < 10) {
      setError('Please provide a reason (minimum 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/admin/beta/users/${user.user_id}/credits/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          amount,
          reason,
          notify_user: notifyUser,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to adjust credits');
      }

      // Success
      onSuccess();
      onClose();

      // Reset form
      setAmount(0);
      setReason('');
      setNotifyUser(false);
    } catch (err) {
      setError(err.message || 'Failed to adjust credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      visible={isOpen}
      onClose={onClose}
      title={`Adjust Credits - ${user?.email}`}
      data-testid="credit-adjustment-modal"
    >
      <div className="space-y-6 p-6">
        {/* Current Balance */}
        <div className="bg-white/5 backdrop-blur-xl rounded-lg p-4">
          <p className="text-sm text-white/60 mb-1">Current Balance</p>
          <p className="text-2xl font-bold text-white">
            {user?.credits_remaining} / {user?.credits_total} credits
          </p>
          <p className="text-sm text-white/60 mt-1">
            {user?.credits_used} used (
            {user && ((user.credits_used / user.credits_total) * 100).toFixed(1)}%)
          </p>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Adjustment Amount
          </label>
          <GlassInput
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            placeholder="Enter amount (positive to add, negative to remove)"
            data-testid="credit-amount-input"
          />
          <p className="text-xs text-white/60 mt-1">
            New balance will be: {user && user.credits_remaining + amount} credits
          </p>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Reason (required)
          </label>
          <GlassTextArea
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why this adjustment is being made..."
            minLength={10}
            maxLength={500}
            rows={4}
            data-testid="credit-reason-textarea"
          />
          <p className="text-xs text-white/60 mt-1">
            {reason.length} / 500 characters (minimum 10)
          </p>
        </div>

        {/* Notify User Checkbox */}
        <GlassCheckbox
          checked={notifyUser}
          onChange={setNotifyUser}
          label="Send email notification to user"
          data-testid="notify-user-checkbox"
        />

        {/* Error Message */}
        {error && (
          <GlassAlert variant="error" data-testid="adjustment-error">
            {error}
          </GlassAlert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <GlassButton
            variant="secondary"
            onPress={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting || !reason || reason.length < 10}
            className="flex-1"
            data-testid="submit-adjustment-button"
          >
            {isSubmitting ? 'Adjusting...' : 'Apply Adjustment'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};

// Main Beta Users Admin Page
export const BetaUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<BetaUser | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);

  // Deactivation modal state
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState<boolean>(false);
  const [deactivateReason, setDeactivateReason] = useState<string>('');
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Fetch beta users
  const fetchBetaUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/v1/admin/beta/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch beta users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load beta users');
    } finally {
      setIsLoading(false);
    }
  };

  // Load users on mount and filter change
  useEffect(() => {
    fetchBetaUsers();
  }, [statusFilter]);

  // Filter users by search query
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle credit adjustment
  const handleOpenAdjustment = (user: BetaUser) => {
    setSelectedUser(user);
    setIsAdjustmentModalOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    fetchBetaUsers(); // Refresh list
  };

  // Handle deactivate user - open modal
  const handleDeactivateUser = (user: BetaUser) => {
    setSelectedUser(user);
    setIsDeactivateModalOpen(true);
    setDeactivateReason('');
    setDeactivateError(null);
  };

  // Confirm deactivation
  const confirmDeactivation = async () => {
    if (!selectedUser) return;

    if (deactivateReason.length < 10) {
      setDeactivateError('Reason must be at least 10 characters');
      return;
    }

    setIsDeactivating(true);
    setDeactivateError(null);

    try {
      const response = await fetch(`/api/v1/admin/beta/users/${selectedUser.user_id}/deactivate?reason=${encodeURIComponent(deactivateReason)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      // Success
      setIsDeactivateModalOpen(false);
      fetchBetaUsers(); // Refresh list
    } catch (err) {
      setDeactivateError(err.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300';
      case 'inactive':
        return 'bg-red-500/20 text-red-300';
      case 'pending_verification':
        return 'bg-yellow-500/20 text-yellow-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  // Get credit level indicator
  const getCreditLevelColor = (remaining: number, total: number): string => {
    const percentage = (remaining / total) * 100;
    if (percentage > 50) return 'text-green-400';
    if (percentage > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Beta 500 User Management</h1>
            <p className="text-white/60">Manage beta users, credits, and access</p>
          </div>
          <GlassButton
            variant="secondary"
            onPress={() => navigate('/admin/beta/analytics')}
          >
            View Analytics
          </GlassButton>
        </div>

        {/* Filters */}
        <GlassCard className="p-6">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <GlassInput
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="user-search-input"
              />
            </div>

            {/* Status Filter */}
            <GlassSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Pending Verification', value: 'pending_verification' },
              ]}
              data-testid="status-filter"
            />
          </div>
        </GlassCard>
      </div>

      {/* User List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <GlassCard className="p-8 text-center">
            <p className="text-white/60">Loading beta users...</p>
          </GlassCard>
        ) : error ? (
          <GlassAlert variant="error">{error}</GlassAlert>
        ) : filteredUsers.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-white/60">No beta users found</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <GlassCard key={user.user_id} className="p-6" data-testid="beta-user-card">
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{user.email}</h3>
                      <GlassBadge className={getStatusColor(user.status)}>
                        {user.status}
                      </GlassBadge>
                    </div>
                    {user.name && (
                      <p className="text-sm text-white/60 mb-1">{user.name}</p>
                    )}
                    <p className="text-xs text-white/40">
                      Enrolled: {new Date(user.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Credit Info */}
                  <div className="text-right mr-8">
                    <p className={`text-2xl font-bold ${getCreditLevelColor(user.credits_remaining, user.credits_total)}`}>
                      {user.credits_remaining}
                    </p>
                    <p className="text-sm text-white/60">
                      / {user.credits_total} credits
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {user.credits_used} used (
                      {((user.credits_used / user.credits_total) * 100).toFixed(1)}%)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <GlassButton
                      variant="secondary"
                      onPress={() => handleOpenAdjustment(user)}
                      data-testid="adjust-credits-button"
                    >
                      Adjust Credits
                    </GlassButton>
                    <GlassButton
                      variant="secondary"
                      onPress={() => navigate(`/admin/beta/users/${user.user_id}`)}
                      data-testid="view-details-button"
                    >
                      View Details
                    </GlassButton>
                    {user.status === 'active' && (
                      <GlassButton
                        variant="danger"
                        onPress={() => handleDeactivateUser(user)}
                        data-testid="deactivate-button"
                      >
                        Deactivate
                      </GlassButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Credit Adjustment Modal */}
      <CreditAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        user={selectedUser}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* Deactivation Modal */}
      <GlassModal
        visible={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate Beta Access"
        data-testid="deactivate-modal"
      >
        <div className="space-y-6 p-6">
          <p className="text-white/80">
            Are you sure you want to deactivate beta access for <strong>{selectedUser?.email}</strong>?
          </p>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Reason for deactivation (required)
            </label>
            <GlassTextArea
              value={deactivateReason}
              onChangeText={setDeactivateReason}
              placeholder="Provide a reason (minimum 10 characters)"
              minLength={10}
              maxLength={500}
              rows={3}
              data-testid="deactivate-reason-textarea"
            />
          </div>

          {/* Error Message */}
          {deactivateError && (
            <GlassAlert variant="error" data-testid="deactivate-error">
              {deactivateError}
            </GlassAlert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <GlassButton
              variant="secondary"
              onPress={() => setIsDeactivateModalOpen(false)}
              disabled={isDeactivating}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="danger"
              onPress={confirmDeactivation}
              disabled={isDeactivating || deactivateReason.length < 10}
              className="flex-1"
              data-testid="confirm-deactivate-button"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default BetaUsersPage;
