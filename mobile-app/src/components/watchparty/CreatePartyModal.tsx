/**
 * CreatePartyModal - Modal for creating a new Watch Party.
 *
 * Provides party name, content selection (via ContentPickerList),
 * privacy toggle, chat/sync toggles, and submit action.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWatchPartyStore } from '@bayit/shared-stores/watchPartyStore';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import {
  GlassButton, GlassInput, GlassModal, GlassErrorBanner,
  spacing,
} from '@olorin/glass-ui/native';
import { logger } from '../../utils/logger';
import Colors from '../../theme/colors';
import { ContentPickerList, type ContentItem } from './ContentPickerList';

const log = logger.scope('CreatePartyModal');

interface CreatePartyModalProps {
  visible: boolean;
  onClose: () => void;
  onPartyCreated: (partyId: string) => void;
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
  visible, onClose, onPartyCreated,
}) => {
  const { t } = useTranslation();
  const createParty = useWatchPartyStore((s) => s.createParty);

  const [partyName, setPartyName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [syncPlayback, setSyncPlayback] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setPartyName(''); setIsPrivate(true); setChatEnabled(true);
    setSyncPlayback(true); setSelectedContent(null); setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!isCreating) { resetForm(); onClose(); }
  }, [isCreating, resetForm, onClose]);

  const handleCreate = useCallback(async () => {
    if (!selectedContent) { setError(t('watchParty.create.selectContentRequired')); return; }
    setIsCreating(true); setError(null);
    try {
      const party = await createParty(selectedContent.id, selectedContent.content_type, {
        title: partyName.trim() || selectedContent.title,
        isPrivate, chatEnabled, syncPlayback,
      });
      log.info('Watch party created', { partyId: party.id, contentId: selectedContent.id });
      resetForm(); onClose(); onPartyCreated(party.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('watchParty.error.createFailed');
      setError(msg); log.error('Failed to create party', err);
    } finally { setIsCreating(false); }
  }, [selectedContent, partyName, isPrivate, chatEnabled, syncPlayback,
      createParty, onClose, onPartyCreated, t, resetForm]);

  return (
    <GlassModal visible={visible} onClose={handleClose} title={t('watchParty.createParty')}>
      <View style={styles.form}>
        {error && <GlassErrorBanner message={error} onDismiss={() => setError(null)} />}

        <Text style={styles.label}>{t('watchParty.create.partyName')}</Text>
        <GlassInput
          placeholder={t('watchParty.create.partyNamePlaceholder')}
          value={partyName} onChangeText={setPartyName} editable={!isCreating}
        />

        <Text style={styles.label}>{t('watchParty.selectContent')}</Text>
        <ContentPickerList
          selectedContent={selectedContent}
          onSelect={setSelectedContent}
          disabled={isCreating}
        />

        <ToggleRow label={t('watchParty.create.private')} disabled={isCreating}
          active={isPrivate} onToggle={() => setIsPrivate((v) => !v)}
          activeLabel={t('watchParty.create.private')} inactiveLabel={t('watchParty.create.public')}
        />
        <ToggleRow label={t('watchParty.options.chatEnabled')} disabled={isCreating}
          active={chatEnabled} onToggle={() => setChatEnabled((v) => !v)}
          activeLabel={t('common.on')} inactiveLabel={t('common.off')}
        />
        <ToggleRow label={t('watchParty.options.syncPlayback')} disabled={isCreating}
          active={syncPlayback} onToggle={() => setSyncPlayback((v) => !v)}
          activeLabel={t('common.on')} inactiveLabel={t('common.off')}
        />

        <View style={styles.actions}>
          <GlassButton variant="secondary" onPress={handleClose}
            disabled={isCreating} style={styles.actionBtn}>{t('common.cancel')}</GlassButton>
          <GlassButton variant="primary" onPress={handleCreate}
            disabled={!selectedContent || isCreating} style={styles.actionBtn}>
            {isCreating
              ? <GlassLoadingSpinner size="small" />
              : t('watchParty.create.submit')}
          </GlassButton>
        </View>
      </View>
    </GlassModal>
  );
};

const ToggleRow: React.FC<{
  label: string; active: boolean; onToggle: () => void;
  activeLabel: string; inactiveLabel: string; disabled?: boolean;
}> = ({ label, active, onToggle, activeLabel, inactiveLabel, disabled }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <GlassButton variant={active ? 'primary' : 'secondary'} size="small"
      onPress={onToggle} disabled={disabled}>{active ? activeLabel : inactiveLabel}</GlassButton>
  </View>
);

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: Colors.Text.secondary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, color: Colors.Text.secondary, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});

export default CreatePartyModal;
