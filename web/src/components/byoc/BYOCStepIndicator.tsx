import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@olorin/design-tokens";

interface BYOCStepIndicatorProps {
  labels: string[];
  activeStep: number;
}

export const BYOCStepIndicator: React.FC<BYOCStepIndicatorProps> = ({
  labels,
  activeStep,
}) => (
  <View style={styles.stepIndicator}>
    {labels.map((label, idx) => (
      <View key={label} style={styles.stepItem}>
        <View
          style={[styles.stepDot, idx <= activeStep && styles.stepDotActive]}
        />
        <Text
          style={[
            styles.stepLabel,
            idx <= activeStep && styles.stepLabelActive,
          ]}
        >
          {label}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  stepItem: { alignItems: "center", gap: spacing.xs },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  stepDotActive: { backgroundColor: colors.primary.DEFAULT },
  stepLabel: { fontSize: 11, color: colors.textSecondary },
  stepLabelActive: { color: colors.text },
});
