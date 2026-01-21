import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';;
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { campaignsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassToggle, GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface CampaignFormData {
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  valid_until: string;
  is_active: boolean;
}

export default function CampaignEditPage() {
  const { t } = useTranslation();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const isNew = !campaignId || campaignId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
  });

  useEffect(() => {
    if (!isNew && campaignId) {
      loadCampaign(campaignId);
    }
  }, [campaignId, isNew]);

  const loadCampaign = async (id: string) => {
    try {
      const campaign = await campaignsService.getCampaign(id);
      if (campaign) {
        setFormData({
          name: campaign.name,
          code: campaign.code || campaign.promo_code || '',
          discount_type: campaign.discount_type || 'percentage',
          discount_value: campaign.discount_value || campaign.discount_percent || 0,
          max_uses: campaign.max_uses || campaign.usage_limit || null,
          valid_until: campaign.valid_until || campaign.end_date?.split('T')[0] || '',
          is_active: campaign.status === 'active',
        });
      }
    } catch (error) {
      logger.error('Failed to load campaign', 'CampaignEditPage', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        promo_code: formData.code,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        usage_limit: formData.max_uses,
        end_date: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        status: formData.is_active ? 'active' : 'draft',
      };

      if (isNew) {
        await campaignsService.createCampaign(payload);
      } else {
        await campaignsService.updateCampaign(campaignId!, payload);
      }
      navigate('/admin/campaigns');
    } catch (error) {
      logger.error('Failed to save campaign', 'CampaignEditPage', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1">
        <Text className="text-sm text-gray-400">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>
            {isNew ? t('admin.campaigns.createTitle') : t('admin.campaigns.editTitle')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.campaigns.formSubtitle')}
          </Text>
        </View>
      </View>

      <GlassCard style={styles.formCard}>
        <View style={styles.formGroup}>
          <GlassInput
            label={t('admin.campaigns.form.name')}
            value={formData.name}
            onChangeText={(name) => setFormData((p) => ({ ...p, name }))}
            placeholder={t('admin.campaigns.form.namePlaceholder')}
            containerStyle={styles.input}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { textAlign }]}>{t('admin.campaigns.form.code')}</Text>
          <View style={[styles.codeRow, { flexDirection }]}>
            <GlassInput
              containerStyle={[styles.input, styles.codeInput]}
              value={formData.code}
              onChangeText={(code) => setFormData((p) => ({ ...p, code: code.toUpperCase() }))}
              placeholder="SUMMER2024"
              autoCapitalize="characters"
            />
            <GlassButton
              title={t('admin.campaigns.form.generate')}
              variant="ghost"
              onPress={generateCode}
            />
          </View>
        </View>

        <View style={[styles.formRow, { flexDirection }]}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { textAlign }]}>{t('admin.campaigns.form.discountType')}</Text>
            <View style={[styles.typeButtons, { flexDirection }]}>
              <GlassButton
                title="%"
                variant={formData.discount_type === 'percentage' ? 'primary' : 'ghost'}
                onPress={() => setFormData((p) => ({ ...p, discount_type: 'percentage' }))}
                style={styles.typeButton}
              />
              <GlassButton
                title="$"
                variant={formData.discount_type === 'fixed' ? 'primary' : 'ghost'}
                onPress={() => setFormData((p) => ({ ...p, discount_type: 'fixed' }))}
                style={styles.typeButton}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.campaigns.form.discountValue')}
              containerStyle={styles.input}
              value={String(formData.discount_value)}
              onChangeText={(v) => setFormData((p) => ({ ...p, discount_value: Number(v) || 0 }))}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={[styles.formRow, { flexDirection }]}>
          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.campaigns.form.maxUses')}
              containerStyle={styles.input}
              value={formData.max_uses ? String(formData.max_uses) : ''}
              onChangeText={(v) => setFormData((p) => ({ ...p, max_uses: v ? Number(v) : null }))}
              placeholder={t('admin.campaigns.form.unlimited')}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.campaigns.form.validUntil')}
              containerStyle={styles.input}
              value={formData.valid_until}
              onChangeText={(v) => setFormData((p) => ({ ...p, valid_until: v }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <GlassToggle
          value={formData.is_active}
          onValueChange={(is_active) => setFormData((p) => ({ ...p, is_active }))}
          label={t('admin.campaigns.form.active')}
          isRTL={isRTL}
        />

        <View style={[styles.actions, { flexDirection }]}>
          <GlassButton
            title={t('common.cancel')}
            variant="cancel"
            onPress={() => navigate('/admin/campaigns')}
          />
          <GlassButton
            title={saving ? t('common.saving') : t('common.save')}
            variant="success"
            onPress={handleSave}
            disabled={saving}
          />
        </View>
      </GlassCard>
    </ScrollView>
  );
}

