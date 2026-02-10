import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileEditModal } from './ProfileEditModal';
import type { User } from '../../../stores/authStore';

interface ProfileHeaderProps {
  user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const avatarUrl = user.avatar;

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.displayName}>{displayName}</Text>
        {user.email && <Text style={styles.email}>{user.email}</Text>}
        {user.isBetaUser && (
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>Beta 500</Text>
            {user.betaCredits !== null && user.betaCredits !== undefined && (
              <Text style={styles.creditsText}>{user.betaCredits} credits</Text>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
        <Text style={styles.editButtonText}>{t('profile.edit', 'Edit')}</Text>
      </TouchableOpacity>

      <ProfileEditModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#A855F7',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  infoContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  betaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  betaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A855F7',
  },
  creditsText: {
    fontSize: 11,
    color: 'rgba(168,85,247,0.8)',
    marginLeft: 6,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
