import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassInput, GlassButton } from "@bayit/shared/ui";
import { spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText("");
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === "Enter") {
      handleSend();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <View style={styles.inputWrap}>
        <GlassInput
          value={text}
          onChangeText={setText}
          placeholder={t("dm.input.placeholder")}
          onKeyPress={handleKeyPress}
          multiline={false}
        />
      </View>
      <GlassButton
        title={t("dm.input.send")}
        onPress={handleSend}
        variant="primary"
        size="sm"
        disabled={disabled || !text.trim()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inputWrap: { flex: 1 },
});
