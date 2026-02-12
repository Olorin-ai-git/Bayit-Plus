import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import { useZehAniStore } from '@/stores/zehAniStore';

const contactsLogger = logger.scope('ContactsManager');

interface ContactsManagerProps {
  profileId: string;
}

const RELATIONSHIP_OPTIONS = [
  'grandparent',
  'parent',
  'uncle_aunt',
  'family_friend',
  'other',
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'he', labelKey: 'languages.hebrew' },
  { value: 'en', labelKey: 'languages.english' },
  { value: 'es', labelKey: 'languages.spanish' },
  { value: 'fr', labelKey: 'languages.french' },
  { value: 'ru', labelKey: 'languages.russian' },
  { value: 'ar', labelKey: 'languages.arabic' },
] as const;

export function ContactsManager({ profileId }: ContactsManagerProps) {
  const { t } = useTranslation();
  const { contacts, loading, error, fetchContacts, addContact, removeContact, clearError } =
    useZehAniStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<string>(RELATIONSHIP_OPTIONS[0]);
  const [language, setLanguage] = useState('he');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContacts(profileId);
  }, [profileId, fetchContacts]);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setRelationship(RELATIONSHIP_OPTIONS[0]);
    setLanguage('he');
    setPin('');
    setShowForm(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !phone.trim() || pin.length < 4) return;
    setSubmitting(true);
    clearError();

    const success = await addContact(profileId, phone.trim(), name.trim(), relationship, language, pin);
    setSubmitting(false);

    if (success) {
      contactsLogger.info('Contact added via form', { profileId });
      resetForm();
    }
  }, [name, phone, pin, relationship, language, profileId, addContact, clearError, resetForm]);

  const handleRemove = useCallback(async (contactId: string) => {
    await removeContact(contactId);
  }, [removeContact]);

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && pin.length >= 4 && !submitting;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white/90">
          {t('zehAni.contacts.title')}
        </h3>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
            {t('zehAni.contacts.addNew')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('zehAni.contacts.form.namePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors" />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder={t('zehAni.contacts.form.phonePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors" />
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none transition-colors">
            {RELATIONSHIP_OPTIONS.map((rel) => (
              <option key={rel} value={rel} className="bg-gray-900 text-white">
                {t(`zehAni.contacts.relationships.${rel}`)}
              </option>
            ))}
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none transition-colors">
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.value} value={lang.value} className="bg-gray-900 text-white">
                {t(lang.labelKey)}
              </option>
            ))}
          </select>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t('zehAni.contacts.form.pinPlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors" />
          <div className="flex gap-2">
            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium transition-colors">
              {submitting ? t('common.saving') : t('zehAni.contacts.form.save')}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-sm transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {loading && contacts.length === 0 && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <p className="text-sm text-white/40 text-center py-4">
          {t('zehAni.contacts.empty')}
        </p>
      )}

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 font-medium truncate">{contact.display_name}</p>
              <p className="text-xs text-white/40">
                {t(`zehAni.contacts.relationships.${contact.relationship}`)}
                {contact.last_sent_at && (
                  <span className="ml-2">
                    {t('zehAni.contacts.lastSent', {
                      date: new Date(contact.last_sent_at).toLocaleDateString(),
                    })}
                  </span>
                )}
              </p>
            </div>
            <button type="button" onClick={() => handleRemove(contact.id)}
              className="ml-3 px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors">
              {t('common.remove')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
