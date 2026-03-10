import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  GlassPageHeader,
  GlassLoadingSpinner,
  GlassEmptyState,
} from "@bayit/shared/ui";
import { spacing } from "@olorin/design-tokens";
import { useDMStore } from "@/stores/dmStore";
import { ConversationList } from "@/components/messages/ConversationList";

export default function DirectMessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversations, isLoading, fetchConversations } = useDMStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelect = (friendId: string) => {
    navigate(`/messages/${friendId}`);
  };

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassPageHeader title={t("dm.title")} />
      {conversations.length === 0 ? (
        <GlassEmptyState
          title={t("dm.empty.title")}
          subtitle={t("dm.empty.subtitle")}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          onSelect={handleSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
