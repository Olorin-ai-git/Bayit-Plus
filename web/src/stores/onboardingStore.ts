import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import logger from "@bayit/shared-utils/logger";

const onboardingLogger = logger.scope("OnboardingStore");

interface OnboardingStoreState {
  currentStep: number;
  completed: boolean;
  voiceSetupDone: boolean;
  tourStepsViewed: string[];
}

interface OnboardingStoreActions {
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  markVoiceSetupDone: () => void;
  markTourStepViewed: (stepId: string) => void;
  markComplete: () => void;
  resetForReplay: () => void;
}

type OnboardingStore = OnboardingStoreState & OnboardingStoreActions;

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      completed: false,
      voiceSetupDone: false,
      tourStepsViewed: [],

      nextStep: () => {
        set((state) => ({ currentStep: state.currentStep + 1 }));
      },

      prevStep: () => {
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        }));
      },

      setStep: (step) => {
        set({ currentStep: step });
      },

      markVoiceSetupDone: () => {
        set({ voiceSetupDone: true });
      },

      markTourStepViewed: (stepId) => {
        const current = get().tourStepsViewed;
        if (!current.includes(stepId)) {
          set({ tourStepsViewed: [...current, stepId] });
        }
      },

      markComplete: () => {
        onboardingLogger.info("Onboarding completed");
        set({ completed: true });
      },

      resetForReplay: () => {
        onboardingLogger.info("Onboarding reset for replay");
        set({
          currentStep: 0,
          completed: false,
          voiceSetupDone: false,
          tourStepsViewed: [],
        });
      },
    }),
    {
      name: "bayit-onboarding",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
