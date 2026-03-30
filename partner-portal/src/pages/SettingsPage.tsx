/**
 * Settings Page
 *
 * Organization settings, branding, webhooks, and preferences.
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
      await updateOrganization({
        name: orgName,
        contactEmail,
      });
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

  const tabs: { id: Tab; labelKey: string; show: boolean }[] = [
    { id: "organization", labelKey: "settings.organization", show: true },
    { id: "branding", labelKey: "settings.branding", show: true },
    {
      id: "webhooks",
      labelKey: "settings.webhooks",
      show: isB2BFeatureEnabled("enableWebhooks"),
    },
    { id: "preferences", labelKey: "settings.preferences", show: true },
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

      <div className="flex gap-2 border-b border-white/10 pb-4">
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-partner-primary text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }
              `}
            >
              {t(tab.labelKey)}
            </button>
          ))}
      </div>

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
        />
      )}
    </div>
  );
};

export default SettingsPage;

/* ---- Sub-components (kept in same file for colocation) ---- */

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
  <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.organization")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.orgName")}
        </label>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.contactEmail")}
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary"
        />
      </div>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="px-6 py-3 rounded-xl bg-partner-primary text-white font-medium text-sm hover:bg-partner-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? t("common.loading") : t("settings.saveChanges")}
      </button>
    </div>
  </div>
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
  <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.branding")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.logoUrl")}
        </label>
        <input
          type="url"
          value={brandLogoUrl}
          onChange={(e) => setBrandLogoUrl(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary"
          placeholder="https://..."
        />
        {brandLogoUrl && (
          <div className="mt-4">
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
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.primaryColor")}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor || "#6366F1"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#6366F1"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.secondaryColor")}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={secondaryColor || "#8B5CF6"}
            onChange={(e) => setSecondaryColor(e.target.value)}
            className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            placeholder="#8B5CF6"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary font-mono text-sm"
          />
        </div>
      </div>

      <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
        <div>
          <span className="text-sm text-white/80">
            {t("settings.showPoweredBy")}
          </span>
          <p className="mt-0.5 text-xs text-white/40">
            {t("settings.showPoweredByHint")}
          </p>
        </div>
        <input
          type="checkbox"
          checked={showPoweredBy}
          onChange={(e) => setShowPoweredBy(e.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.brandPreview")}
        </label>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
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

      <button
        onClick={onSave}
        disabled={isSaving}
        className="px-6 py-3 rounded-xl bg-partner-primary text-white font-medium text-sm hover:bg-partner-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? t("common.loading") : t("settings.saveChanges")}
      </button>
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
  <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.webhooks")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.webhookUrl")}
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary"
          placeholder="https://your-server.com/webhook"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.webhookSecret")}
        </label>
        <input
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-partner-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.webhookEvents")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEBHOOK_EVENTS.map((event) => (
            <label
              key={event}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <input
                type="checkbox"
                checked={webhookEvents.includes(event)}
                onChange={() => toggleWebhookEvent(event)}
                className="h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
              />
              <span className="text-sm text-white/80 font-mono">{event}</span>
            </label>
          ))}
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={isSaving || !webhookUrl}
        className="px-6 py-3 rounded-xl bg-partner-primary text-white font-medium text-sm hover:bg-partner-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? t("common.loading") : t("settings.saveChanges")}
      </button>
    </div>
  </div>
);

interface PreferencesTabProps {
  t: (key: string) => string;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({
  t,
  language,
  onLanguageChange,
}) => (
  <div className="rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl p-6">
    <h2 className="text-lg font-semibold text-white mb-6">
      {t("settings.preferences")}
    </h2>
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t("settings.language")}
        </label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-partner-primary"
        >
          <option value="he">עברית</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-3">
          {t("settings.notifications")}
        </label>
        <div className="space-y-3">
          <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
            <span className="text-sm text-white/80">Email notifications</span>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
            <span className="text-sm text-white/80">Usage alerts</span>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
            <span className="text-sm text-white/80">Product updates</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
);
