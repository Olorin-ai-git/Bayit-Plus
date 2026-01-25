import { useState, useEffect } from 'react';
import { Flame, Moon, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
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
  const { isRTL } = useDirection();
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
      // Use the selected city's timezone to display the correct local time
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: selectedCity?.timezone || 'America/New_York',
      };
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', options);
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
      <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={24} color={colors.warning} />
          <h3
            className="text-xl font-bold"
            style={{ textAlign: isRTL ? 'right' : 'left', color: colors.text }}
          >
            {t('judaism.shabbat.title', 'Shabbat Times')}
          </h3>
        </div>

        {/* City Picker */}
        <button
          onClick={() => setShowCityPicker(!showCityPicker)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity `}
          style={{ backgroundColor: colors.glassLight }}
        >
          <MapPin size={14} color={colors.textMuted} />
          <span className="text-sm" style={{ color: colors.text }}>
            {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Select City'}
          </span>
          <ChevronDown size={14} color={colors.textMuted} />
        </button>
      </div>

      {/* City Dropdown */}
      {showCityPicker && (
        <div
          className="rounded-lg p-2 mb-4 max-h-40 overflow-auto"
          style={{ backgroundColor: colors.glassStrong }}
        >
          {cities.map((city) => (
            <button
              key={city.geoname_id}
              onClick={() => {
                setSelectedCity(city);
                setShowCityPicker(false);
              }}
              className="w-full p-2 rounded text-left cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: selectedCity?.geoname_id === city.geoname_id ? `${colors.primary}4D` : 'transparent',
              }}
            >
              <span style={{ color: colors.text }}>
                {city.name}, {city.state}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={32} color={colors.warning} className="animate-spin" />
        </div>
      ) : shabbatTimes ? (
        <>
          {/* Parasha */}
          {getParasha() && (
            <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: `${colors.primary}33` }}>
              <p className="text-sm text-center" style={{ color: colors.primaryLight }}>
                {t('judaism.shabbat.parashat', 'Parashat')}
              </p>
              <p className="text-xl font-bold text-center mt-1" style={{ color: colors.text }}>
                {getParasha()}
              </p>
            </div>
          )}

          {/* Times */}
          <div className="flex gap-4">
            {/* Candle Lighting */}
            <div
              className="flex-1 rounded-xl p-4 flex flex-col items-center"
              style={{ backgroundColor: `${colors.warning}33` }}
            >
              <Flame size={32} color={colors.warning} />
              <span className="text-sm mt-2" style={{ color: colors.warning }}>
                {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
              </span>
              <span className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
                {formatTime(shabbatTimes.candle_lighting)}
              </span>
              <span className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('judaism.shabbat.friday', 'Friday')}
              </span>
            </div>

            {/* Havdalah */}
            <div
              className="flex-1 rounded-xl p-4 flex flex-col items-center"
              style={{ backgroundColor: `${colors.primary}33` }}
            >
              <Moon size={32} color={colors.primaryLight} />
              <span className="text-sm mt-2" style={{ color: colors.primaryLight }}>
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </span>
              <span className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
                {formatTime(shabbatTimes.havdalah)}
              </span>
              <span className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('judaism.shabbat.saturday', 'Saturday')}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-4 flex justify-center">
          <span style={{ color: colors.textMuted }}>
            {t('judaism.shabbat.noData', 'Unable to load Shabbat times')}
          </span>
        </div>
      )}
      </div>
    </GlassCard>
  );
}
