import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Flame, Moon, MapPin, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface ShabbatTimes {
  city: string;
  state: string;
  candle_lighting: string;
  havdalah: string;
  parasha?: string;
  parasha_he?: string;
  hebrew_date?: string;
}

interface City {
  name: string;
  state: string;
  geoname_id: number;
  timezone: string;
}

interface ShabbatTimesCardProps {
  defaultCity?: string;
  defaultState?: string;
}

export function ShabbatTimesCard({ defaultCity = 'New York', defaultState = 'NY' }: ShabbatTimesCardProps) {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [shabbatTimes, setShabbatTimes] = useState<ShabbatTimes | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      loadShabbatTimes();
    }
  }, [selectedCity]);

  const loadCities = async () => {
    try {
      const response = await judaismService.getAvailableCities();
      if (response?.cities) {
        setCities(response.cities);
        // Find and select default city
        const defaultCityData = response.cities.find(
          (c: City) => c.name === defaultCity && c.state === defaultState
        );
        setSelectedCity(defaultCityData || response.cities[0]);
      }
    } catch (err) {
      logger.error('Failed to load cities', 'ShabbatTimesCard', err);
    }
  };

  const loadShabbatTimes = async () => {
    if (!selectedCity) return;

    try {
      setIsLoading(true);
      const response = await judaismService.getShabbatTimes(
        selectedCity.name,
        selectedCity.state,
        selectedCity.geoname_id
      );
      if (response) {
        setShabbatTimes(response);
      }
    } catch (err) {
      logger.error('Failed to load Shabbat times', 'ShabbatTimesCard', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  const getParasha = () => {
    if (!shabbatTimes?.parasha) return null;
    return i18n.language === 'he' ? shabbatTimes.parasha_he : shabbatTimes.parasha;
  };

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View className="flex-row items-center gap-2" style={{ flexDirection }}>
          <Flame size={24} color="#F59E0B" />
          <Text className="text-xl font-bold text-white" style={{ textAlign }}>
            {t('judaism.shabbat.title', 'Shabbat Times')}
          </Text>
        </View>

        {/* City Picker */}
        <Pressable
          onPress={() => setShowCityPicker(!showCityPicker)}
          className="flex-row items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full"
          style={{ flexDirection }}
        >
          <MapPin size={14} color={colors.textMuted} />
          <Text className="text-white text-sm">
            {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Select City'}
          </Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* City Dropdown */}
      {showCityPicker && (
        <View className="bg-black/50 rounded-lg p-2 mb-4 max-h-40 overflow-auto">
          {cities.map((city) => (
            <Pressable
              key={city.geoname_id}
              onPress={() => {
                setSelectedCity(city);
                setShowCityPicker(false);
              }}
              className={`p-2 rounded ${selectedCity?.geoname_id === city.geoname_id ? 'bg-blue-500/30' : ''}`}
            >
              <Text className="text-white">
                {city.name}, {city.state}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : shabbatTimes ? (
        <>
          {/* Parasha */}
          {getParasha() && (
            <View className="bg-purple-500/20 rounded-lg p-3 mb-4">
              <Text className="text-purple-300 text-sm text-center">
                {t('judaism.shabbat.parashat', 'Parashat')}
              </Text>
              <Text className="text-white text-xl font-bold text-center mt-1">
                {getParasha()}
              </Text>
            </View>
          )}

          {/* Times */}
          <View className="flex-row gap-4">
            {/* Candle Lighting */}
            <View className="flex-1 bg-orange-500/20 rounded-xl p-4 items-center">
              <Flame size={32} color="#F59E0B" />
              <Text className="text-orange-300 text-sm mt-2">
                {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
              </Text>
              <Text className="text-white text-2xl font-bold mt-1">
                {formatTime(shabbatTimes.candle_lighting)}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {t('judaism.shabbat.friday', 'Friday')}
              </Text>
            </View>

            {/* Havdalah */}
            <View className="flex-1 bg-indigo-500/20 rounded-xl p-4 items-center">
              <Moon size={32} color="#818CF8" />
              <Text className="text-indigo-300 text-sm mt-2">
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </Text>
              <Text className="text-white text-2xl font-bold mt-1">
                {formatTime(shabbatTimes.havdalah)}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {t('judaism.shabbat.saturday', 'Saturday')}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View className="py-4 items-center">
          <Text className="text-gray-400">
            {t('judaism.shabbat.noData', 'Unable to load Shabbat times')}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}
