import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@olorin/design-tokens";

interface VoiceWaveformProps {
  isActive: boolean;
  audioLevel: number;
}

const BAR_COUNT = 20;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MAX_HEIGHT = 40;

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  audioLevel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      barsRef.current = barsRef.current.map((prev, i) => {
        if (!isActive) return prev * 0.9;
        const center = BAR_COUNT / 2;
        const dist = Math.abs(i - center) / center;
        const target = audioLevel * MAX_HEIGHT * (1 - dist * 0.6);
        const jitter = Math.random() * audioLevel * 8;
        return prev + (target + jitter - prev) * 0.3;
      });

      const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
      const startX = (width - totalWidth) / 2;

      barsRef.current.forEach((h, i) => {
        const x = startX + i * (BAR_WIDTH + BAR_GAP);
        const barH = Math.max(2, h);
        const y = (height - barH) / 2;
        ctx.fillStyle = colors.primary.DEFAULT;
        ctx.globalAlpha = isActive ? 0.8 : 0.3;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barH, 1);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, audioLevel]);

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        style={{ width: 200, height: 60 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
});
