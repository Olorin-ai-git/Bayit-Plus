import { useState, useEffect } from 'react';
import { Building2, Utensils, Users, MapPin, Phone, Globe, ChevronDown, Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface Organization {
  id: string;
  name: string;
  name_he?: string;
  organization_type: string;
  denomination?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  region?: string;
  phone?: string;
  email?: string;
  website?: string;
  services: string[];
  kosher_certification?: string;
  cuisine_type?: string;
  price_range?: string;
  description?: string;
  rabbi_name?: string;
  is_verified: boolean;
}

interface Region {
  id: string;
  name: string;
  name_he?: string;
  state: string;
  organization_count: number;
}

type DirectoryTab = 'synagogues' | 'kosher' | 'jcc' | 'mikvaot';

export function CommunityDirectory() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [activeTab, setActiveTab] = useState<DirectoryTab>('synagogues');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const tabs: { id: DirectoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'synagogues', label: t('judaism.community.synagogues', 'Synagogues'), icon: <Building2 size={16} /> },
    { id: 'kosher', label: t('judaism.community.kosher', 'Kosher'), icon: <Utensils size={16} /> },
    { id: 'jcc', label: t('judaism.community.jcc', 'JCC'), icon: <Users size={16} /> },
    { id: 'mikvaot', label: t('judaism.community.mikvaot', 'Mikvaot'), icon: <MapPin size={16} /> },
  ];

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [activeTab, selectedRegion]);

  const loadRegions = async () => {
    try {
      const response = await judaismService.getRegions();
      if (response?.regions) {
        setRegions(response.regions);
        // Default to NYC if available
        const nyc = response.regions.find((r: Region) => r.id === 'nyc');
        if (nyc) {
          setSelectedRegion(nyc.id);
        }
      }
    } catch (err) {
      logger.error('Failed to load regions', 'CommunityDirectory', err);
    }
  };

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      let response;

      switch (activeTab) {
        case 'synagogues':
          response = await judaismService.getSynagogues(selectedRegion || undefined);
          break;
        case 'kosher':
          response = await judaismService.getKosherRestaurants(selectedRegion || undefined);
          break;
        case 'jcc':
          response = await judaismService.getJCCs(selectedRegion || undefined);
          break;
        case 'mikvaot':
          response = await judaismService.getMikvaot(selectedRegion || undefined);
          break;
      }

      if (response?.organizations) {
        setOrganizations(response.organizations);
      }
    } catch (err) {
      logger.error('Failed to load organizations', 'CommunityDirectory', err);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRegionName = (region: Region) => {
    return i18n.language === 'he' && region.name_he ? region.name_he : region.name;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'synagogue':
      case 'chabad':
        return <Building2 size={20} color={colors.primary} />;
      case 'restaurant':
      case 'bakery':
      case 'grocery':
        return <Utensils size={20} color={colors.warning} />;
      case 'jcc':
      case 'community_center':
        return <Users size={20} color={colors.primaryLight} />;
      case 'mikvah':
        return <MapPin size={20} color={colors.success} />;
      default:
        return <Building2 size={20} color={colors.primary} />;
    }
  };

  const getDenominationColor = (denom?: string) => {
    const denomColors: Record<string, string> = {
      orthodox: colors.primary,
      modern_orthodox: colors.primaryDark,
      conservative: colors.primaryLight,
      reform: colors.success,
      chabad: colors.warning,
    };
    return denomColors[denom || ''] || colors.textMuted;
  };

  return (
    <GlassCard className="p-4">
      <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search size={24} color={colors.primary} />
          <h3
            className="text-xl font-bold"
            style={{ textAlign: isRTL ? 'right' : 'left', color: colors.text }}
          >
            {t('judaism.community.title', 'Community Directory')}
          </h3>
        </div>

        {/* Region Picker */}
        <button
          onClick={() => setShowRegionPicker(!showRegionPicker)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity `}
          style={{ backgroundColor: colors.glassLight }}
        >
          <MapPin size={14} color={colors.textMuted} />
          <span className="text-sm" style={{ color: colors.text }}>
            {selectedRegion
              ? getRegionName(regions.find((r) => r.id === selectedRegion) || regions[0])
              : t('common.selectRegion', 'Select Region')}
          </span>
          <ChevronDown size={14} color={colors.textMuted} />
        </button>
      </div>

      {/* Region Dropdown */}
      {showRegionPicker && (
        <div
          className="rounded-lg p-2 mb-4 max-h-40 overflow-auto"
          style={{ backgroundColor: colors.glassStrong }}
        >
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                setSelectedRegion(region.id);
                setShowRegionPicker(false);
              }}
              className="w-full flex justify-between items-center p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: selectedRegion === region.id ? `${colors.primary}4D` : 'transparent' }}
            >
              <span style={{ color: colors.text }}>{getRegionName(region)}</span>
              <span className="text-sm" style={{ color: colors.textMuted }}>({region.organization_count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: activeTab === tab.id ? colors.primary : colors.glassLight }}
          >
            {tab.icon}
            <span className="text-sm" style={{ color: colors.text }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Organizations List */}
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={32} color={colors.primary} className="animate-spin" />
        </div>
      ) : organizations.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          {organizations.map((org, index) => (
            <div
              key={org.id}
              className="py-4"
              style={{ borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.glassBorderWhite }}
            >
              <div className={`flex items-start gap-3 `}>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.glassLight }}
                >
                  {getTypeIcon(org.organization_type)}
                </div>
                <div className="flex-1">
                  <div className={`flex items-center gap-2 `}>
                    <span
                      className="font-semibold"
                      style={{ textAlign: isRTL ? 'right' : 'left', color: colors.text }}
                    >
                      {i18n.language === 'he' && org.name_he ? org.name_he : org.name}
                    </span>
                    {org.is_verified && (
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${colors.success}4D` }}
                      >
                        <span className="text-xs" style={{ color: colors.success }}>✓</span>
                      </span>
                    )}
                  </div>

                  {/* Denomination/Certification Badge */}
                  {(org.denomination || org.kosher_certification) && (
                    <div className={`flex mt-1 `}>
                      <span
                        className="px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${getDenominationColor(org.denomination)}4D`,
                        }}
                      >
                        <span
                          className="text-xs"
                          style={{ color: getDenominationColor(org.denomination) }}
                        >
                          {org.denomination?.replace('_', ' ') || org.kosher_certification}
                        </span>
                      </span>
                      {org.cuisine_type && (
                        <span className="px-2 py-0.5 rounded ml-2" style={{ backgroundColor: `${colors.warning}33` }}>
                          <span className="text-xs" style={{ color: colors.warning }}>{org.cuisine_type}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  <div className={`flex items-center gap-1 mt-2 `}>
                    <MapPin size={12} color={colors.textMuted} />
                    <span className="text-sm" style={{ color: colors.textMuted }}>
                      {org.address}, {org.city}, {org.state} {org.zip_code}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className={`flex gap-4 mt-2 `}>
                    {org.phone && (
                      <a
                        href={`tel:${org.phone}`}
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <Phone size={12} color={colors.primaryLight} />
                        <span className="text-sm" style={{ color: colors.primaryLight }}>{org.phone}</span>
                      </a>
                    )}
                    {org.website && (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <Globe size={12} color={colors.primaryLight} />
                        <span className="text-sm" style={{ color: colors.primaryLight }}>
                          {t('common.website', 'Website')}
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Services */}
                  {org.services && org.services.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-2 `}>
                      {org.services.slice(0, 3).map((service, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded" style={{ backgroundColor: colors.glassLight }}>
                          <span className="text-xs" style={{ color: colors.textMuted }}>{service}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 flex flex-col items-center">
          <span style={{ color: colors.textMuted }}>
            {t('judaism.community.empty', 'No organizations found')}
          </span>
          <span className="text-sm mt-1" style={{ color: colors.textDimmed }}>
            {t('judaism.community.emptyHint', 'Try selecting a different region')}
          </span>
        </div>
      )}
      </div>
    </GlassCard>
  );
}
