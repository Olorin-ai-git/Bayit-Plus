/**
 * ContactsManagement - Manage contacts for sharing avatar content.
 *
 * Displays contact list with search filtering, add/remove actions,
 * and empty state guidance.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const contactsLogger = logger.scope('ContactsManagement');

interface Contact {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
}

interface ContactsManagementProps {
  contacts: Contact[];
  onAdd: () => void;
  onRemove: (contactId: string) => void;
}

export const ContactsManagement: React.FC<ContactsManagementProps> = ({
  contacts,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRemove = useCallback((contactId: string, contactName: string) => {
    contactsLogger.info('Contact removed', { contactId });
    onRemove(contactId);
  }, [onRemove]);

  const renderContact = useCallback(({ item }: { item: Contact }) => (
    <View style={styles.contactRow}
      accessibilityLabel={t('zehAni.contacts.contactLabel', { name: item.name })}
      accessibilityRole="text">
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.email && (
          <Text style={styles.contactEmail} numberOfLines={1}>{item.email}</Text>
        )}
      </View>
      <Pressable style={styles.removeButton}
        onPress={() => handleRemove(item.id, item.name)}
        accessibilityLabel={t('zehAni.contacts.removeContact', { name: item.name })}
        accessibilityHint={t('zehAni.contacts.removeHint')}
        accessibilityRole="button">
        <OlorinIcon name="user-minus" size={18} color={Colors.Error.default} />
      </Pressable>
    </View>
  ), [handleRemove, t]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('zehAni.contacts.title')}
        </Text>
        <Text style={styles.count}
          accessibilityLabel={t('zehAni.contacts.countLabel', {
            count: String(contacts.length),
          })}>
          {contacts.length}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <OlorinIcon name="search" size={18} color={Colors.Text.muted} />
        <TextInput style={styles.searchInput}
          value={searchQuery} onChangeText={setSearchQuery}
          placeholder={t('zehAni.contacts.searchPlaceholder')}
          placeholderTextColor={Colors.Text.disabled}
          accessibilityLabel={t('zehAni.contacts.searchLabel')}
          accessibilityHint={t('zehAni.contacts.searchHint')}
          accessibilityRole="search" />
      </View>

      {filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <OlorinIcon name="users" size={32} color={Colors.Text.muted} />
          <Text style={styles.emptyText}>
            {searchQuery
              ? t('zehAni.contacts.noResults')
              : t('zehAni.contacts.empty')}
          </Text>
        </View>
      ) : (
        <FlatList data={filteredContacts} keyExtractor={(item) => item.id}
          renderItem={renderContact} contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false} />
      )}

      <GlassButton title={t('zehAni.contacts.addContact')} onPress={() => {
        contactsLogger.info('Add contact initiated');
        onAdd();
      }}
        variant="primary"
        accessibilityLabel={t('zehAni.contacts.addContact')}
        accessibilityHint={t('zehAni.contacts.addContactHint')}
        accessibilityRole="button" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary, padding: 16, gap: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.Text.primary },
  count: {
    fontSize: 16, fontWeight: '600', color: Colors.Primary.p400,
    backgroundColor: Colors.Glass.whiteSubtle, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.Text.primary },
  listContent: { gap: 8 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.Glass.whiteSubtle, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.Primary.p900,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: Colors.Text.primary },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.Text.primary },
  contactEmail: { fontSize: 13, color: Colors.Text.muted, marginTop: 2 },
  removeButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.Text.muted, textAlign: 'center' },
});
