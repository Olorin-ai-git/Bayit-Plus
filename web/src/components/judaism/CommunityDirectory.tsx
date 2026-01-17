import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Building2, Utensils, Users, MapPin, Phone, Globe, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
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
  const { isRTL, textAlign, flexDirection } = useDirection();
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
          response = await judaismService.getSynagogues(selectedRegion);
          break;
        case 'kosher':
          response = await judaismService.getKosherRestaurants(selectedRegion);
          break;
        case 'jcc':
          response = await judaismService.getJCCs(selectedRegion);
          break;
        case 'mikvaot':
          response = await judaismService.getMikvaot(selectedRegion);
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
        return <Building2 size={20} color="#8B5CF6" />;
      case 'restaurant':
      case 'bakery':
      case 'grocery':
        return <Utensils size={20} color="#F59E0B" />;
      case 'jcc':
      case 'community_center':
        return <Users size={20} color="#3B82F6" />;
      case 'mikvah':
        return <MapPin size={20} color="#10B981" />;
      default:
        return <Building2 size={20} color={colors.primary} />;
    }
  };

  const getDenominationColor = (denom?: string) => {
    const colors: Record<string, string> = {
      orthodox: '#8B5CF6',
      modern_orthodox: '#7C3AED',
      conservative: '#3B82F6',
      reform: '#10B981',
      chabad: '#F59E0B',
    };
    return colors[denom || ''] || '#6B7280';
  };

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View className="flex-row items-center gap-2" style={{ flexDirection }}>
          <Search size={24} color={colors.primary} />
          <Text className="text-xl font-bold text-white" style={{ textAlign }}>
            {t('judaism.community.title', 'Community Directory')}
          </Text>
        </View>

        {/* Region Picker */}
        <Pressable
          onPress={() => setShowRegionPicker(!showRegionPicker)}
          className="flex-row items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full"
          style={{ flexDirection }}
        >
          <MapPin size={14} color={colors.textMuted} />
          <Text className="text-white text-sm">
            {selectedRegion
              ? getRegionName(regions.find((r) => r.id === selectedRegion) || regions[0])
              : t('common.selectRegion', 'Select Region')}
          </Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Region Dropdown */}
      {showRegionPicker && (
        <View className="bg-black/50 rounded-lg p-2 mb-4 max-h-40 overflow-auto">
          {regions.map((region) => (
            <Pressable
              key={region.id}
              onPress={() => {
                setSelectedRegion(region.id);
                setShowRegionPicker(false);
              }}
              className={`flex-row justify-between items-center p-2 rounded ${selectedRegion === region.id ? 'bg-blue-500/30' : ''}`}
            >
              <Text className="text-white">{getRegionName(region)}</Text>
              <Text className="text-gray-400 text-sm">({region.organization_count})</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${
              activeTab === tab.id ? 'bg-blue-500' : 'bg-white/10'
            }`}
          >
            {tab.icon}
            <Text className="text-white text-sm">{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Organizations List */}
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : organizations.length > 0 ? (
        <ScrollView className="max-h-96">
          {organizations.map((org, index) => (
            <View
              key={org.id}
              className={`py-4 ${index > 0 ? 'border-t border-white/10' : ''}`}
            >
              <View className="flex-row items-start gap-3" style={{ flexDirection }}>
                <View className="w-10 h-10 bg-white/10 rounded-lg items-center justify-center">
                  {getTypeIcon(org.organization_type)}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2" style={{ flexDirection }}>
                    <Text className="text-white font-semibold" style={{ textAlign }}>
                      {i18n.language === 'he' && org.name_he ? org.name_he : org.name}
                    </Text>
                    {org.is_verified && (
                      <View className="bg-green-500/30 px-1.5 py-0.5 rounded">
                        <Text className="text-green-400 text-xs">✓</Text>
                      </View>
                    )}
                  </View>

                  {/* Denomination/Certification Badge */}
                  {(org.denomination || org.kosher_certification) && (
                    <View className="flex-row mt-1" style={{ flexDirection }}>
                      <View
                        className="px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${getDenominationColor(org.denomination)}30`,
                        }}
                      >
                        <Text
                          className="text-xs"
                          style={{ color: getDenominationColor(org.denomination) }}
                        >
                          {org.denomination?.replace('_', ' ') || org.kosher_certification}
                        </Text>
                      </View>
                      {org.cuisine_type && (
                        <View className="bg-yellow-500/20 px-2 py-0.5 rounded ml-2">
                          <Text className="text-yellow-400 text-xs">{org.cuisine_type}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Address */}
                  <View className="flex-row items-center gap-1 mt-2" style={{ flexDirection }}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text className="text-gray-400 text-sm">
                      {org.address}, {org.city}, {org.state} {org.zip_code}
                    </Text>
                  </View>

                  {/* Contact Info */}
                  <View className="flex-row gap-4 mt-2" style={{ flexDirection }}>
                    {org.phone && (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${org.phone}`)}
                        className="flex-row items-center gap-1"
                      >
                        <Phone size={12} color="#3B82F6" />
                        <Text className="text-blue-400 text-sm">{org.phone}</Text>
                      </Pressable>
                    )}
                    {org.website && (
                      <Pressable
                        onPress={() => Linking.openURL(org.website!)}
                        className="flex-row items-center gap-1"
                      >
                        <Globe size={12} color="#3B82F6" />
                        <Text className="text-blue-400 text-sm">
                          {t('common.website', 'Website')}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Services */}
                  {org.services && org.services.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-2" style={{ flexDirection }}>
                      {org.services.slice(0, 3).map((service, idx) => (
                        <View key={idx} className="bg-white/5 px-2 py-0.5 rounded">
                          <Text className="text-gray-400 text-xs">{service}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="py-8 items-center">
          <Text className="text-gray-400">
            {t('judaism.community.empty', 'No organizations found')}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">
            {t('judaism.community.emptyHint', 'Try selecting a different region')}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}
