/**
 * Settings Page
 *
 * Organization settings, branding, webhooks, and preferences.
 * Uses @olorin/glass-ui/web components exclusively.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTabs,
  GlassToggle,
} from "@olorin/glass-ui/web";
import { usePartnerStore } from "../stores/partnerStore";
import { toast } from "../stores/uiStore";
import { isB2BFeatureEnabled } from "../config/env";
import { PageHeader, LoadingSpinner } from "../components/common";

type Tab = "organization" | "branding" | "webhooks" | "preferences";

const WEBHOOK_EVENTS = [
  "api_key.created",
  "api_key.revoked",
  "team.member_invited",
  "team.member_removed",
  "billing.subscription_updated",
  "billing.invoice_created",
  "usage.quota_warning",
  "usage.quota_exceeded",
];

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    organization,
    isLoading,
    fetchOrganization,
    updateOrganization,
    updateWebhook,
  } = usePartnerStore();

  const [activeTab, setActiveTab] = useState<Tab>("organization");
  const [isSaving, setIsSaving] = useState(false);

  // Organization form
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Branding form
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [showPoweredBy, setShowPoweredBy] = useState(true);

  // Webhook form
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookSecret, setWebhookSecret] = useState("");

  // Preferences
  const [language, setLanguage] = useState(i18n.language);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [usageAlerts, setUsageAlerts] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setContactEmail(organization.contactEmail);
      setWebhookUrl(organization.webhookUrl || "");
      setWebhookEvents(organization.webhookEvents || []);
      if (organization.branding) {
        setPrimaryColor(organization.branding.primary_color || "");
        setSecondaryColor(organization.branding.secondary_color || "");
        setBrandLogoUrl(organization.branding.logo_url || "");
        setShowPoweredBy(organization.branding.show_powered_by ?? true);
      }
    }
  }, [organization]);

  const handleSaveOrganization = async () => {
    setIsSaving(true);
    try {
      await updateOrganization({ name: orgName, contactEmail });
      toast.success(t("common.success"));
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await updateOrganization({
        branding: {
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
          logo_url: brandLogoUrl || null,
          website_url: organization?.branding?.website_url ?? null,
          show_powered_by: showPoweredBy,
        },
      });
      toast.success(t("common.success"));
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWebhook = async () => {
    setIsSaving(true);
    try {
      await updateWebhook({
        url: webhookUrl,
        events: webhookEvents,
        secret: webhookSecret || undefined,
      });
      toast.success(t("common.success"));
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem("b2b_language", newLang);
    document.documentElement.dir = newLang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    toast.success(t("common.success"));
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const visibleTabs = [
    { id: "organization", label: t("settings.organization") },
    { id: "branding", label: t("settings.branding") },
    ...(isB2BFeatureEnabled("enableWebhooks")
      ? [{ id: "webhooks", label: t("settings.webhooks") }]
      : []),
    { id: "preferences", label: t("settings.preferences") },
  ];

  if (isLoading && !organization) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("settings.title")} />

      <GlassTabs
        tabs={visibleTabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
        variant="pills"
      />

      {activeTab === "organization" && (
        <OrganizationTab
          t={t}
          orgName={orgName}
          setOrgName={setOrgName}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          isSaving={isSaving}
          onSave={handleSaveOrganization}
        />
      )}

      {activeTab === "branding" && (
        <BrandingTab
          t={t}
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          secondaryColor={secondaryColor}
          setSecondaryColor={setSecondaryColor}
          brandLogoUrl={brandLogoUrl}
          setBrandLogoUrl={setBrandLogoUrl}
          showPoweredBy={showPoweredBy}
          setShowPoweredBy={setShowPoweredBy}
          orgName={orgName}
          isSaving={isSaving}
          onSave={handleSaveBranding}
        />
      )}

      {activeTab === "webhooks" && (
        <WebhooksTab
          t={t}
          webhookUrl={webhookUrl}
          setWebhookUrl={setWebhookUrl}
          webhookSecret={webhookSecret}
          setWebhookSecret={setWebhookSecret}
          webhookEvents={webhookEvents}
          toggleWebhookEvent={toggleWebhookEvent}
          isSaving={isSaving}
          onSave={handleSaveWebhook}
        />
      )}

      {activeTab === "preferences" && (
        <PreferencesTab
          t={t}
          language={language}
          onLanguageChange={handleLanguageChange}
          emailNotifs={emailNotifs}
          setEmailNotifs={setEmailNotifs}
          usageAlerts={usageAlerts}
          setUsageAlerts={setUsageAlerts}
          productUpdates={productUpdates}
          setProductUpdates={setProductUpdates}
        />
      )}
    </div>
  );
};

export default SettingsPage;

/* ---- Sub-components ---- */

interface OrganizationTabProps {
  t: (key: string) => string;
  orgName: string;
  setOrgName: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

const OrganizationTab: React.FC<OrganizationTabProps> = ({
  t,
  orgName,
  setOrgName,
  contactEmail,
  setContactEmail,
  isSaving,
  onSave,
}) => (
  <GlassCard>
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.organization")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <GlassInput
        label={t("settings.orgName")}
        type="text"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
      />
      <GlassInput
        label={t("settings.contactEmail")}
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
      />
      <GlassButton
        onClick={onSave}
        disabled={isSaving}
        loading={isSaving}
        size="md"
      >
        {t("settings.saveChanges")}
      </GlassButton>
    </div>
  </GlassCard>
);

interface BrandingTabProps {
  t: (key: string) => string;
  primaryColor: string;
  setPrimaryColor: (v: string) => void;
  secondaryColor: string;
  setSecondaryColor: (v: string) => void;
  brandLogoUrl: string;
  setBrandLogoUrl: (v: string) => void;
  showPoweredBy: boolean;
  setShowPoweredBy: (v: boolean) => void;
  orgName: string;
  isSaving: boolean;
  onSave: () => void;
}

const BrandingTab: React.FC<BrandingTabProps> = ({
  t,
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  brandLogoUrl,
  setBrandLogoUrl,
  showPoweredBy,
  setShowPoweredBy,
  orgName,
  isSaving,
  onSave,
}) => (
  <GlassCard>
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.branding")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <GlassInput
        label={t("settings.logoUrl")}
        type="url"
        value={brandLogoUrl}
        onChange={(e) => setBrandLogoUrl(e.target.value)}
        placeholder="https://..."
      />
      {brandLogoUrl && (
        <div className="mt-2">
          <img
            src={brandLogoUrl}
            alt={t("settings.branding")}
            className="h-16 w-auto rounded-lg bg-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <ColorPickerField
        label={t("settings.primaryColor")}
        value={primaryColor}
        onChange={setPrimaryColor}
        defaultColor="#6366F1"
      />

      <ColorPickerField
        label={t("settings.secondaryColor")}
        value={secondaryColor}
        onChange={setSecondaryColor}
        defaultColor="#8B5CF6"
      />

      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-glass-bg border border-glass-border">
        <div>
          <span className="text-sm text-white/80">
            {t("settings.showPoweredBy")}
          </span>
          <p className="mt-0.5 text-xs text-white/40">
            {t("settings.showPoweredByHint")}
          </p>
        </div>
        <GlassToggle checked={showPoweredBy} onChange={setShowPoweredBy} />
      </div>

      <div>
        <span className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.brandPreview")}
        </span>
        <div className="rounded-xl border border-glass-border bg-glass-bg p-4 flex items-center gap-3">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={orgName}
              className="h-8 w-8 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor || "#6366F1" }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="font-semibold text-sm"
            style={{ color: primaryColor || "#6366F1" }}
          >
            {orgName}
          </span>
          {showPoweredBy && (
            <span className="text-xs text-white/40 ml-auto">
              Powered by Olorin
            </span>
          )}
        </div>
      </div>

      <GlassButton
        onClick={onSave}
        disabled={isSaving}
        loading={isSaving}
        size="md"
      >
        {t("settings.saveChanges")}
      </GlassButton>
    </div>
  </GlassCard>
);

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  defaultColor: string;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  label,
  value,
  onChange,
  defaultColor,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm font-medium text-white/80">{label}</span>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || defaultColor}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 rounded-lg border border-glass-border bg-transparent cursor-pointer"
      />
      <GlassInput
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultColor}
        className="font-mono"
      />
    </div>
  </div>
);

interface WebhooksTabProps {
  t: (key: string) => string;
  webhookUrl: string;
  setWebhookUrl: (v: string) => void;
  webhookSecret: string;
  setWebhookSecret: (v: string) => void;
  webhookEvents: string[];
  toggleWebhookEvent: (event: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

const WebhooksTab: React.FC<WebhooksTabProps> = ({
  t,
  webhookUrl,
  setWebhookUrl,
  webhookSecret,
  setWebhookSecret,
  webhookEvents,
  toggleWebhookEvent,
  isSaving,
  onSave,
}) => (
  <GlassCard>
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.webhooks")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <GlassInput
        label={t("settings.webhookUrl")}
        type="url"
        value={webhookUrl}
        onChange={(e) => setWebhookUrl(e.target.value)}
        placeholder="https://your-server.com/webhook"
      />
      <GlassInput
        label={t("settings.webhookSecret")}
        type="password"
        value={webhookSecret}
        onChange={(e) => setWebhookSecret(e.target.value)}
      />
      <div>
        <span className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.webhookEvents")}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEBHOOK_EVENTS.map((event) => (
            <div
              key={event}
              onClick={() => toggleWebhookEvent(event)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-glass-bg border border-glass-border cursor-pointer hover:bg-glass-hover transition-colors"
              role="checkbox"
              aria-checked={webhookEvents.includes(event)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleWebhookEvent(event);
                }
              }}
            >
              <GlassToggle
                checked={webhookEvents.includes(event)}
                onChange={() => toggleWebhookEvent(event)}
              />
              <span className="text-sm text-white/80 font-mono">{event}</span>
            </div>
          ))}
        </div>
      </div>
      <GlassButton
        onClick={onSave}
        disabled={isSaving || !webhookUrl}
        loading={isSaving}
        size="md"
      >
        {t("settings.saveChanges")}
      </GlassButton>
    </div>
  </GlassCard>
);

interface PreferencesTabProps {
  t: (key: string) => string;
  language: string;
  onLanguageChange: (lang: string) => void;
  emailNotifs: boolean;
  setEmailNotifs: (v: boolean) => void;
  usageAlerts: boolean;
  setUsageAlerts: (v: boolean) => void;
  productUpdates: boolean;
  setProductUpdates: (v: boolean) => void;
}

const LANGUAGE_OPTIONS = [
  { value: "he", label: "\u05E2\u05D1\u05E8\u05D9\u05EA" },
  { value: "en", label: "English" },
  { value: "es", label: "Espa\u00F1ol" },
];

const PreferencesTab: React.FC<PreferencesTabProps> = ({
  t,
  language,
  onLanguageChange,
  emailNotifs,
  setEmailNotifs,
  usageAlerts,
  setUsageAlerts,
  productUpdates,
  setProductUpdates,
}) => (
  <GlassCard>
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.preferences")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <GlassSelect
        label={t("settings.language")}
        options={LANGUAGE_OPTIONS}
        value={language}
        onChange={onLanguageChange}
      />
      <div>
        <span className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.notifications")}
        </span>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-glass-bg border border-glass-border">
            <span className="text-sm text-white/80">
              {t("settings.emailNotifications")}
            </span>
            <GlassToggle checked={emailNotifs} onChange={setEmailNotifs} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-glass-bg border border-glass-border">
            <span className="text-sm text-white/80">
              {t("settings.usageAlerts")}
            </span>
            <GlassToggle checked={usageAlerts} onChange={setUsageAlerts} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-glass-bg border border-glass-border">
            <span className="text-sm text-white/80">
              {t("settings.productUpdates")}
            </span>
            <GlassToggle
              checked={productUpdates}
              onChange={setProductUpdates}
            />
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
);
