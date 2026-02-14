/**
 * MessageInputBar - Text input bar with send button for DM conversations.
 *
 * Supports multiline input with dynamic height expansion.
 * Send button activates only when input has content and is not disabled.
 */

import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../theme/colors';

interface MessageInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_INPUT_HEIGHT = 120;
const MIN_INPUT_HEIGHT = 40;

export const MessageInputBar: React.FC<MessageInputBarProps> = ({
  onSend,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setInputHeight(MIN_INPUT_HEIGHT);
    Keyboard.dismiss();
  }, [text, onSend]);

  const handleContentSizeChange = useCallback(
    (event: { nativeEvent: { contentSize: { height: number } } }) => {
      const newHeight = Math.min(
        Math.max(event.nativeEvent.contentSize.height, MIN_INPUT_HEIGHT),
        MAX_INPUT_HEIGHT,
      );
      setInputHeight(newHeight);
    },
    [],
  );

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { height: inputHeight }]}
        value={text}
        onChangeText={setText}
        placeholder={t('directMessages.typePlaceholder')}
        placeholderTextColor={Colors.Text.disabled}
        multiline
        editable={!disabled}
        onContentSizeChange={handleContentSizeChange}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        returnKeyType="default"
        accessible
        accessibilityRole="search"
        accessibilityLabel={t('directMessages.messageInputLabel')}
        accessibilityHint={t('directMessages.messageInputHint')}
      />
      <GlassButton
        variant="primary"
        size="small"
        onPress={handleSend}
        disabled={!canSend}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('directMessages.sendButton')}
        accessibilityHint={t('directMessages.sendButtonHint')}
      >
        {t('directMessages.send')}
      </GlassButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.Glass.border,
    backgroundColor: Colors.Background.primary,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: Colors.Text.primary,
    fontSize: 15,
    lineHeight: 21,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
});
