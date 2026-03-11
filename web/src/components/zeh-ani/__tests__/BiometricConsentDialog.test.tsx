import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BiometricConsentDialog } from "../BiometricConsentDialog";
import api from "@/services/api";

jest.mock("@/services/api");
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/stores/avatarMeshStore", () => ({
  useAvatarMeshStore: () => ({
    consentStatus: null,
    loading: false,
    error: null,
    grantConsent: jest.fn().mockResolvedValue(true),
    checkConsent: jest.fn(),
    clearError: jest.fn(),
  }),
}));

describe("BiometricConsentDialog", () => {
  const mockOnConsentGranted = jest.fn();
  const mockProfileId = "profile-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders consent dialog with all consent types", () => {
    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    expect(
      screen.getByText(/zehAni.consent.biometric.title/i),
    ).toBeInTheDocument();
  });

  it("requires PIN input before granting consent", async () => {
    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /zehAni.consent.biometric.submit/i,
    });
    expect(submitButton).toBeDisabled();

    const pinInput = screen.getByLabelText(
      /zehAni.consent.biometric.pinLabel/i,
    );
    await userEvent.type(pinInput, "1234");

    expect(submitButton).toBeDisabled();
  });

  it("validates PIN length", async () => {
    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    const pinInput = screen.getByLabelText(
      /zehAni.consent.biometric.pinLabel/i,
    );
    await userEvent.type(pinInput, "12"); // Only 2 digits (below min 4)

    const submitButton = screen.getByRole("button", {
      name: /zehAni.consent.biometric.submit/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("calls onConsentGranted after successful consent grant", async () => {
    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes[0]) {
      fireEvent.click(checkboxes[0]);
    }

    const pinInput = screen.getByLabelText(
      /zehAni.consent.biometric.pinLabel/i,
    );
    await userEvent.type(pinInput, "1234");

    const submitButton = screen.getByRole("button", {
      name: /zehAni.consent.biometric.submit/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnConsentGranted).toHaveBeenCalled();
    });
  });

  it("displays error when consent grant fails", async () => {
    const mockStore = {
      consentStatus: null,
      loading: false,
      error: "zehAni.consent.biometric.error",
      grantConsent: jest.fn().mockResolvedValue(false),
      checkConsent: jest.fn(),
      clearError: jest.fn(),
    };

    jest
      .mocked(require("@/stores/avatarMeshStore").useAvatarMeshStore)
      .mockReturnValue(mockStore);

    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    expect(
      screen.getByText("zehAni.consent.biometric.error"),
    ).toBeInTheDocument();
  });

  it("checks consent on mount", () => {
    const checkConsent = jest.fn();
    jest
      .mocked(require("@/stores/avatarMeshStore").useAvatarMeshStore)
      .mockReturnValue({
        consentStatus: null,
        loading: false,
        error: null,
        grantConsent: jest.fn().mockResolvedValue(true),
        checkConsent,
        clearError: jest.fn(),
      });

    render(
      <BiometricConsentDialog
        profileId={mockProfileId}
        onConsentGranted={mockOnConsentGranted}
      />,
    );

    expect(checkConsent).toHaveBeenCalledWith(mockProfileId);
  });
});
