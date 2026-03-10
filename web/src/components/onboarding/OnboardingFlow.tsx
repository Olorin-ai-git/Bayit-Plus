import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigate } from "react-router-dom";
import { colors } from "@olorin/design-tokens";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { WelcomeStep } from "./WelcomeStep";
import { VoiceSetupStep } from "./VoiceSetupStep";
import { FeatureTour } from "./FeatureTour";

const STEP_WELCOME = 0;
const STEP_VOICE = 1;
const STEP_TOUR = 2;

export const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, nextStep, markVoiceSetupDone, markComplete } =
    useOnboardingStore();

  const handleComplete = () => {
    markComplete();
    navigate("/");
  };

  const handleSkipVoice = () => {
    nextStep();
  };

  const handleVoiceComplete = () => {
    markVoiceSetupDone();
    nextStep();
  };

  return (
    <View style={styles.container}>
      {currentStep === STEP_WELCOME && <WelcomeStep onGetStarted={nextStep} />}
      {currentStep === STEP_VOICE && (
        <VoiceSetupStep
          onComplete={handleVoiceComplete}
          onSkip={handleSkipVoice}
        />
      )}
      {currentStep === STEP_TOUR && (
        <FeatureTour onComplete={handleComplete} onSkip={handleComplete} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
