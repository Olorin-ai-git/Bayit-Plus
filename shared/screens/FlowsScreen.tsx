import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../contexts/ProfileContext';
import api from '../services/api';
import { FlowItemCard } from '../components/flows';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FlowItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail?: string;
  duration_hint?: number;
  order: number;
}

interface FlowTrigger {
  type: 'time' | 'shabbat' | 'holiday';
  start_time?: string;
  end_time?: string;
  days?: number[];
  skip_shabbat?: boolean;
  candle_lighting_offset?: number;
}

interface Flow {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  icon: string;
  flow_type: string;
  is_active: boolean;
  items: FlowItem[];
  triggers: FlowTrigger[];
  auto_play: boolean;
  ai_enabled: boolean;
  ai_brief_enabled: boolean;
}

const FLOW_ICONS: { [key: string]: { icon: string; colors: string[] } } = {
  'טקס בוקר': { icon: 'sunny', colors: ['#ff9500', '#ff6b00'] },
  'ליל שבת': { icon: 'moon', colors: ['#5856d6', '#8b5cf6'] },
  'שעת שינה': { icon: 'bed', colors: ['#1a1a2e', '#4a4a8a'] },
  'זמן ילדים': { icon: 'happy', colors: ['#ff2d55', '#ff6b9d'] },
};

const FlowsScreen = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { currentProfile } = useProfile();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const isTV = Platform.isTV || Platform.OS === 'tvos';

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const getLocalizedName = (flow: Flow) => {
    const lang = i18n.language;
    if (lang === 'en' && flow.name_en) return flow.name_en;
    if (lang === 'es' && flow.name_es) return flow.name_es;
    return flow.name;
  };

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const [flowsRes, activeRes] = await Promise.all([
        api.get('/flows'),
        api.get('/flows/active'),
      ]);
      setFlows(flowsRes.data);
      if (activeRes.data.should_show && activeRes.data.active_flow) {
        setActiveFlow(activeRes.data.active_flow);
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlows();
    }, [])
  );

  useEffect(() => {
    if (activeFlow) {
      // Pulse animation for active flow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [activeFlow]);

  const handleStartFlow = async (flow: Flow) => {
    try {
      const response = await api.get(`/flows/${flow.id}/content`);
      // Navigate to player with flow content
      if (response.data.content && response.data.content.length > 0) {
        navigation.navigate('Player', {
          flowId: flow.id,
          flowName: getLocalizedName(flow),
          playlist: response.data.content,
          aiBrief: response.data.ai_brief,
        });
      } else {
        // Show flow details if no content yet
        setSelectedFlow(flow);
        setShowFlowModal(true);
      }
    } catch (error) {
      console.error('Error starting flow:', error);
    }
  };

  const handleSkipToday = async (flow: Flow) => {
    try {
      await api.post(`/flows/${flow.id}/skip-today`);
      setActiveFlow(null);
    } catch (error) {
      console.error('Error skipping flow:', error);
    }
  };

  const getFlowIcon = (flow: Flow) => {
    const config = FLOW_ICONS[flow.name] || { icon: 'play-circle', colors: ['#a855f7', '#0099cc'] };
    return config;
  };

  const formatTriggerTime = (trigger: FlowTrigger) => {
    if (trigger.type === 'shabbat') {
      return t('flows.trigger.shabbat');
    }
    if (trigger.type === 'holiday') {
      return t('flows.trigger.holiday');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return t('flows.trigger.time');
  };

  const getDaysDisplay = (days: number[] | undefined) => {
    if (!days || days.length === 0 || days.length === 7) {
      return t('flows.days.everyDay');
    }
    const dayNames = [
      t('flows.days.sundayShort'),
      t('flows.days.mondayShort'),
      t('flows.days.tuesdayShort'),
      t('flows.days.wednesdayShort'),
      t('flows.days.thursdayShort'),
      t('flows.days.fridayShort'),
      t('flows.days.saturdayShort'),
    ];
    return days.map(d => dayNames[d]).join(', ');
  };

  const renderActiveFlowBanner = () => {
    if (!activeFlow) return null;

    const iconConfig = getFlowIcon(activeFlow);
    const glowColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(107, 33, 168, 0.3)', 'rgba(168, 85, 247, 0.6)'],
    });

    return (
      <Animated.View className="mb-8 rounded-2xl overflow-hidden shadow-lg" style={{ shadowColor: '#a855f7', shadowOpacity: glowAnim }}>
        <LinearGradient
          colors={['rgba(107, 33, 168, 0.3)', 'rgba(107, 33, 168, 0.15)']}
          className="flex-row items-center p-6 border border-purple-500/60 rounded-2xl"
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient colors={iconConfig.colors} className="w-20 h-20 rounded-xl justify-center items-center">
              <Ionicons name={iconConfig.icon as any} size={40} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <View className="flex-1 ml-5">
            <Text className="text-xs text-purple-500 font-semibold uppercase tracking-wider mb-1">{t('flows.activeNow', 'Active Now')}</Text>
            <Text className="text-2xl font-bold text-white mb-1">{getLocalizedName(activeFlow)}</Text>
            {activeFlow.description && (
              <Text className="text-sm text-gray-400">{activeFlow.description}</Text>
            )}
          </View>

          <View className="items-end gap-3">
            <TouchableOpacity
              className="rounded-xl overflow-hidden"
              onPress={() => handleStartFlow(activeFlow)}
            >
              <LinearGradient
                colors={['#a855f7', '#0099cc']}
                className="flex-row items-center px-6 py-3 gap-2"
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text className="text-base font-semibold text-white">{t('flows.start', 'Start')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-2 px-4"
              onPress={() => handleSkipToday(activeFlow)}
            >
              <Text className="text-sm text-gray-400">{t('flows.skipToday', 'Skip Today')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderFlowCard = (flow: Flow, index: number) => {
    const iconConfig = getFlowIcon(flow);
    const isFocused = focusedIndex === index;
    const isSystem = flow.flow_type === 'system';

    return (
      <TouchableOpacity
        key={flow.id}
        className={`rounded-xl overflow-hidden border ${isFocused ? 'border-purple-500' : 'border-white/10'}`}
        onPress={() => handleStartFlow(flow)}
        onFocus={() => setFocusedIndex(index)}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          className="flex-row items-center p-4"
        >
          <LinearGradient colors={iconConfig.colors} className="w-14 h-14 rounded-xl justify-center items-center">
            <Ionicons name={iconConfig.icon as any} size={32} color="#fff" />
          </LinearGradient>

          <View className="flex-1 ml-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-lg font-semibold text-white">{getLocalizedName(flow)}</Text>
              {isSystem && (
                <View className="bg-purple-600/30 px-2 py-0.5 rounded">
                  <Text className="text-[10px] text-purple-500 font-semibold uppercase">{t('flows.system', 'System')}</Text>
                </View>
              )}
            </View>

            {flow.description && (
              <Text className="text-sm text-gray-400 mb-2" numberOfLines={2}>
                {flow.description}
              </Text>
            )}

            {flow.triggers.length > 0 && (
              <View className="flex-row items-center gap-1 mb-2">
                <Ionicons name="time-outline" size={14} color="#888" />
                <Text className="text-xs text-gray-400">
                  {formatTriggerTime(flow.triggers[0])}
                </Text>
              </View>
            )}

            <View className="flex-row gap-2">
              {flow.ai_enabled && (
                <View className="flex-row items-center gap-1 bg-purple-600/30 px-2 py-1 rounded">
                  <Ionicons name="sparkles" size={12} color="#a855f7" />
                  <Text className="text-[11px] text-purple-500">AI</Text>
                </View>
              )}
              {flow.auto_play && (
                <View className="flex-row items-center gap-1 bg-purple-600/30 px-2 py-1 rounded">
                  <Ionicons name="play-circle" size={12} color="#a855f7" />
                  <Text className="text-[11px] text-purple-500">{t('flows.autoPlay', 'Auto')}</Text>
                </View>
              )}
              {flow.items.length > 0 && (
                <View className="flex-row items-center gap-1 bg-purple-600/30 px-2 py-1 rounded">
                  <Ionicons name="list" size={12} color="#a855f7" />
                  <Text className="text-[11px] text-purple-500">
                    {flow.items.length} {t('flows.items', 'items')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="p-2">
            <Ionicons name="chevron-forward" size={24} color="#888" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View className="flex-1 bg-black/80 justify-center items-center">
        <View className="w-[45%] bg-[#1a1a2e] rounded-3xl p-10 items-center border border-white/10">
          <LinearGradient
            colors={['#a855f7', '#0099cc']}
            className="w-24 h-24 rounded-3xl justify-center items-center mb-6"
          >
            <Ionicons name="add-circle" size={48} color="#fff" />
          </LinearGradient>

          <Text className="text-3xl font-bold text-white mb-3 text-center">
            {t('flows.createFlow')}
          </Text>
          <Text className="text-base text-gray-400 text-center mb-6 leading-6">
            {t('flows.createFlowDesc')}
          </Text>

          <View className="flex-row items-center gap-4 bg-purple-600/30 p-5 rounded-xl mb-6">
            <Ionicons name="phone-portrait-outline" size={24} color="#a855f7" />
            <Text className="flex-1 text-sm text-purple-500 leading-5">
              {t('flows.tv.useCompanion', `For full customization, use the ${t('common.appName', 'Bayit+')} app on your phone or visit bayit.plus on your computer.`)}
            </Text>
          </View>

          <View className="flex-row gap-4">
            <TouchableOpacity
              className="bg-white/10 px-10 py-3.5 rounded-lg"
              onPress={() => setShowCreateModal(false)}
            >
              <Text className="text-base text-white font-semibold">{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFlowModal = () => (
    <Modal
      visible={showFlowModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFlowModal(false)}
    >
      <View className="flex-1 bg-black/80 justify-center items-center">
        <View style={{ width: SCREEN_WIDTH * 0.5 }} className="bg-[#1a1a2e] rounded-3xl p-8 items-center border border-white/10">
          {selectedFlow && (
            <>
              <LinearGradient
                colors={getFlowIcon(selectedFlow).colors}
                className="w-24 h-24 rounded-3xl justify-center items-center mb-5"
              >
                <Ionicons
                  name={getFlowIcon(selectedFlow).icon as any}
                  size={48}
                  color="#fff"
                />
              </LinearGradient>

              <Text className="text-3xl font-bold text-white mb-2 text-center">{getLocalizedName(selectedFlow)}</Text>
              {selectedFlow.description && (
                <Text className="text-base text-gray-400 text-center mb-6">{selectedFlow.description}</Text>
              )}

              <View className="flex-row justify-between w-full py-3 border-b border-white/10">
                <Text className="text-sm text-gray-400">{t('flows.type')}:</Text>
                <Text className="text-sm text-white font-medium">
                  {selectedFlow.flow_type === 'system'
                    ? t('flows.systemFlow')
                    : t('flows.customFlow')}
                </Text>
              </View>

              {selectedFlow.triggers.length > 0 && (
                <>
                  <View className="flex-row justify-between w-full py-3 border-b border-white/10">
                    <Text className="text-sm text-gray-400">{t('flows.schedule')}:</Text>
                    <Text className="text-sm text-white font-medium">
                      {formatTriggerTime(selectedFlow.triggers[0])}
                    </Text>
                  </View>
                  {selectedFlow.triggers[0].type === 'time' && selectedFlow.triggers[0].days && (
                    <View className="flex-row justify-between w-full py-3 border-b border-white/10">
                      <Text className="text-sm text-gray-400">{t('flows.days.title')}:</Text>
                      <Text className="text-sm text-white font-medium">
                        {getDaysDisplay(selectedFlow.triggers[0].days)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Feature badges */}
              <View className="flex-row justify-center gap-3 mt-4 mb-2 flex-wrap">
                {selectedFlow.ai_enabled && (
                  <View className="flex-row items-center gap-1.5 bg-purple-600/30 px-3 py-1.5 rounded-lg">
                    <Ionicons name="sparkles" size={14} color="#a855f7" />
                    <Text className="text-[13px] text-purple-500 font-medium">{t('flows.aiEnabled')}</Text>
                  </View>
                )}
                {selectedFlow.ai_brief_enabled && (
                  <View className="flex-row items-center gap-1.5 bg-purple-700/10 px-3 py-1.5 rounded-lg">
                    <Ionicons name="document-text" size={14} color="#8b5cf6" />
                    <Text className="text-[13px] text-purple-600 font-medium">
                      {t('flows.aiBrief')}
                    </Text>
                  </View>
                )}
                {selectedFlow.auto_play && (
                  <View className="flex-row items-center gap-1.5 bg-purple-600/30 px-3 py-1.5 rounded-lg">
                    <Ionicons name="play-circle" size={14} color="#a855f7" />
                    <Text className="text-[13px] text-purple-500 font-medium">{t('flows.autoPlay')}</Text>
                  </View>
                )}
              </View>

              {/* Flow Items */}
              <View className="w-full mt-4 border-t border-white/10 pt-4">
                <Text className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  {t('flows.content')} ({selectedFlow.items.length})
                </Text>
                {selectedFlow.items.length > 0 ? (
                  <ScrollView
                    className="max-h-[200px]"
                    showsVerticalScrollIndicator={false}
                  >
                    {selectedFlow.items.slice(0, 5).map((item, index) => (
                      <FlowItemCard
                        key={`${item.content_id}-${index}`}
                        item={item}
                        index={index}
                        totalItems={selectedFlow.items.length}
                        editable={false}
                        isRTL={isRTL}
                      />
                    ))}
                    {selectedFlow.items.length > 5 && (
                      <Text className="text-[13px] text-purple-500 text-center mt-2 font-medium">
                        +{selectedFlow.items.length - 5} {t('flows.flowItems.more')}
                      </Text>
                    )}
                  </ScrollView>
                ) : (
                  <View className="flex-row items-center justify-center gap-2 py-4 bg-orange-500/10 rounded-lg">
                    <Ionicons name="sparkles" size={20} color="#ff9500" />
                    <Text className="text-sm text-orange-500 font-medium">
                      {t('flows.aiGenerated')}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row gap-4 mt-6">
                <TouchableOpacity
                  className="rounded-lg overflow-hidden"
                  onPress={() => {
                    setShowFlowModal(false);
                    handleStartFlow(selectedFlow);
                  }}
                >
                  <LinearGradient
                    colors={['#a855f7', '#0099cc']}
                    className="flex-row items-center gap-2 px-6 py-3"
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text className="text-base font-semibold text-white">{t('flows.start')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-white/10 px-8 py-3 rounded-lg"
                  onPress={() => setShowFlowModal(false)}
                >
                  <Text className="text-base text-white font-semibold">{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0a0a0a]">
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const systemFlows = flows.filter(f => f.flow_type === 'system');
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
        className="absolute inset-0"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 40, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-white mb-2">{t('flows.title', 'Flows')}</Text>
          <Text className="text-base text-gray-400">
            {t('flows.subtitle', 'Curated content experiences for every moment')}
          </Text>
        </View>

        {/* Active Flow Banner */}
        {renderActiveFlowBanner()}

        {/* System Flows */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-white mb-4">
            {t('flows.systemFlows', 'Ready-Made Flows')}
          </Text>
          <View className="gap-3">
            {systemFlows.map((flow, index) => renderFlowCard(flow, index))}
          </View>
        </View>

        {/* Custom Flows */}
        {customFlows.length > 0 && (
          <View className="mb-8">
            <Text className="text-xl font-semibold text-white mb-4">
              {t('flows.customFlows', 'My Flows')}
            </Text>
            <View className="gap-3">
              {customFlows.map((flow, index) =>
                renderFlowCard(flow, systemFlows.length + index)
              )}
            </View>
          </View>
        )}

        {/* Create Flow Button */}
        <TouchableOpacity
          className="mt-2.5 rounded-xl overflow-hidden border border-dashed border-purple-500/60"
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={['rgba(107, 33, 168, 0.3)', 'rgba(107, 33, 168, 0.15)']}
            className="flex-row items-center justify-center p-5 gap-3"
          >
            <Ionicons name="add-circle-outline" size={24} color="#a855f7" />
            <Text className="text-base text-purple-500 font-semibold">
              {t('flows.createCustom')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {renderFlowModal()}
      {renderCreateModal()}
    </View>
  );
};

export default FlowsScreen;
