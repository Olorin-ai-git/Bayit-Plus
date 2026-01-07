import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    const config = FLOW_ICONS[flow.name] || { icon: 'play-circle', colors: ['#00d9ff', '#0099cc'] };
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
      outputRange: ['rgba(0,217,255,0.2)', 'rgba(0,217,255,0.6)'],
    });

    return (
      <Animated.View style={[styles.activeBanner, { shadowColor: '#00d9ff', shadowOpacity: glowAnim }]}>
        <LinearGradient
          colors={['rgba(0,217,255,0.15)', 'rgba(0,217,255,0.05)']}
          style={styles.activeBannerGradient}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient colors={iconConfig.colors} style={styles.activeFlowIcon}>
              <Ionicons name={iconConfig.icon as any} size={40} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <View style={styles.activeBannerContent}>
            <Text style={styles.activeFlowLabel}>{t('flows.activeNow', 'Active Now')}</Text>
            <Text style={styles.activeFlowTitle}>{getLocalizedName(activeFlow)}</Text>
            {activeFlow.description && (
              <Text style={styles.activeFlowDesc}>{activeFlow.description}</Text>
            )}
          </View>

          <View style={styles.activeBannerActions}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleStartFlow(activeFlow)}
            >
              <LinearGradient
                colors={['#00d9ff', '#0099cc']}
                style={styles.startButtonGradient}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.startButtonText}>{t('flows.start', 'Start')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => handleSkipToday(activeFlow)}
            >
              <Text style={styles.skipButtonText}>{t('flows.skipToday', 'Skip Today')}</Text>
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
        style={[styles.flowCard, isFocused && styles.flowCardFocused]}
        onPress={() => handleStartFlow(flow)}
        onFocus={() => setFocusedIndex(index)}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={styles.flowCardGradient}
        >
          <LinearGradient colors={iconConfig.colors} style={styles.flowIcon}>
            <Ionicons name={iconConfig.icon as any} size={32} color="#fff" />
          </LinearGradient>

          <View style={styles.flowCardContent}>
            <View style={styles.flowCardHeader}>
              <Text style={styles.flowCardTitle}>{getLocalizedName(flow)}</Text>
              {isSystem && (
                <View style={styles.systemBadge}>
                  <Text style={styles.systemBadgeText}>{t('flows.system', 'System')}</Text>
                </View>
              )}
            </View>

            {flow.description && (
              <Text style={styles.flowCardDesc} numberOfLines={2}>
                {flow.description}
              </Text>
            )}

            {flow.triggers.length > 0 && (
              <View style={styles.triggerInfo}>
                <Ionicons name="time-outline" size={14} color="#888" />
                <Text style={styles.triggerText}>
                  {formatTriggerTime(flow.triggers[0])}
                </Text>
              </View>
            )}

            <View style={styles.flowFeatures}>
              {flow.ai_enabled && (
                <View style={styles.featureBadge}>
                  <Ionicons name="sparkles" size={12} color="#00d9ff" />
                  <Text style={styles.featureText}>AI</Text>
                </View>
              )}
              {flow.auto_play && (
                <View style={styles.featureBadge}>
                  <Ionicons name="play-circle" size={12} color="#00d9ff" />
                  <Text style={styles.featureText}>{t('flows.autoPlay', 'Auto')}</Text>
                </View>
              )}
              {flow.items.length > 0 && (
                <View style={styles.featureBadge}>
                  <Ionicons name="list" size={12} color="#00d9ff" />
                  <Text style={styles.featureText}>
                    {flow.items.length} {t('flows.items', 'items')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.playIconContainer}>
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
      <View style={styles.modalOverlay}>
        <View style={styles.createModalContent}>
          <LinearGradient
            colors={['#00d9ff', '#0099cc']}
            style={styles.createModalIcon}
          >
            <Ionicons name="add-circle" size={48} color="#fff" />
          </LinearGradient>

          <Text style={styles.createModalTitle}>
            {t('flows.createFlow')}
          </Text>
          <Text style={styles.createModalDesc}>
            {t('flows.createFlowDesc')}
          </Text>

          <View style={styles.createModalInfo}>
            <Ionicons name="phone-portrait-outline" size={24} color="#00d9ff" />
            <Text style={styles.createModalInfoText}>
              {t('flows.tv.useCompanion', 'For full customization, use the Bayit+ app on your phone or visit bayit.plus on your computer.')}
            </Text>
          </View>

          <View style={styles.createModalActions}>
            <TouchableOpacity
              style={styles.createModalButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.createModalButtonText}>{t('common.close')}</Text>
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedFlow && (
            <>
              <LinearGradient
                colors={getFlowIcon(selectedFlow).colors}
                style={styles.modalIcon}
              >
                <Ionicons
                  name={getFlowIcon(selectedFlow).icon as any}
                  size={48}
                  color="#fff"
                />
              </LinearGradient>

              <Text style={styles.modalTitle}>{getLocalizedName(selectedFlow)}</Text>
              {selectedFlow.description && (
                <Text style={styles.modalDesc}>{selectedFlow.description}</Text>
              )}

              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoLabel}>{t('flows.type')}:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedFlow.flow_type === 'system'
                    ? t('flows.systemFlow')
                    : t('flows.customFlow')}
                </Text>
              </View>

              {selectedFlow.triggers.length > 0 && (
                <>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoLabel}>{t('flows.schedule')}:</Text>
                    <Text style={styles.modalInfoValue}>
                      {formatTriggerTime(selectedFlow.triggers[0])}
                    </Text>
                  </View>
                  {selectedFlow.triggers[0].type === 'time' && selectedFlow.triggers[0].days && (
                    <View style={styles.modalInfo}>
                      <Text style={styles.modalInfoLabel}>{t('flows.days.title')}:</Text>
                      <Text style={styles.modalInfoValue}>
                        {getDaysDisplay(selectedFlow.triggers[0].days)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Feature badges */}
              <View style={styles.modalFeatures}>
                {selectedFlow.ai_enabled && (
                  <View style={[styles.modalFeatureBadge, styles.aiBadge]}>
                    <Ionicons name="sparkles" size={14} color="#00d9ff" />
                    <Text style={styles.modalFeatureText}>{t('flows.aiEnabled')}</Text>
                  </View>
                )}
                {selectedFlow.ai_brief_enabled && (
                  <View style={[styles.modalFeatureBadge, styles.briefBadge]}>
                    <Ionicons name="document-text" size={14} color="#8b5cf6" />
                    <Text style={[styles.modalFeatureText, { color: '#8b5cf6' }]}>
                      {t('flows.aiBrief')}
                    </Text>
                  </View>
                )}
                {selectedFlow.auto_play && (
                  <View style={styles.modalFeatureBadge}>
                    <Ionicons name="play-circle" size={14} color="#00d9ff" />
                    <Text style={styles.modalFeatureText}>{t('flows.autoPlay')}</Text>
                  </View>
                )}
              </View>

              {/* Flow Items */}
              <View style={styles.modalItemsSection}>
                <Text style={styles.modalItemsTitle}>
                  {t('flows.content')} ({selectedFlow.items.length})
                </Text>
                {selectedFlow.items.length > 0 ? (
                  <ScrollView
                    style={styles.modalItemsList}
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
                      <Text style={styles.moreItemsText}>
                        +{selectedFlow.items.length - 5} {t('flows.flowItems.more')}
                      </Text>
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.aiGeneratedNote}>
                    <Ionicons name="sparkles" size={20} color="#ff9500" />
                    <Text style={styles.aiGeneratedText}>
                      {t('flows.aiGenerated')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalStartButton}
                  onPress={() => {
                    setShowFlowModal(false);
                    handleStartFlow(selectedFlow);
                  }}
                >
                  <LinearGradient
                    colors={['#00d9ff', '#0099cc']}
                    style={styles.modalStartGradient}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.modalStartText}>{t('flows.start')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowFlowModal(false)}
                >
                  <Text style={styles.modalButtonText}>{t('common.close')}</Text>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  const systemFlows = flows.filter(f => f.flow_type === 'system');
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('flows.title', 'Flows')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('flows.subtitle', 'Curated content experiences for every moment')}
          </Text>
        </View>

        {/* Active Flow Banner */}
        {renderActiveFlowBanner()}

        {/* System Flows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('flows.systemFlows', 'Ready-Made Flows')}
          </Text>
          <View style={styles.flowsGrid}>
            {systemFlows.map((flow, index) => renderFlowCard(flow, index))}
          </View>
        </View>

        {/* Custom Flows */}
        {customFlows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('flows.customFlows', 'My Flows')}
            </Text>
            <View style={styles.flowsGrid}>
              {customFlows.map((flow, index) =>
                renderFlowCard(flow, systemFlows.length + index)
              )}
            </View>
          </View>
        )}

        {/* Create Flow Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={['rgba(0,217,255,0.1)', 'rgba(0,217,255,0.05)']}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add-circle-outline" size={24} color="#00d9ff" />
            <Text style={styles.createButtonText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  activeBanner: {
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  activeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    borderRadius: 16,
  },
  activeFlowIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBannerContent: {
    flex: 1,
    marginLeft: 20,
  },
  activeFlowLabel: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  activeFlowTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  activeFlowDesc: {
    fontSize: 14,
    color: '#888',
  },
  activeBannerActions: {
    alignItems: 'flex-end',
    gap: 12,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  flowsGrid: {
    gap: 12,
  },
  flowCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flowCardFocused: {
    borderColor: '#00d9ff',
    transform: [{ scale: 1.02 }],
  },
  flowCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  flowIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowCardContent: {
    flex: 1,
    marginLeft: 16,
  },
  flowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  flowCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  systemBadge: {
    backgroundColor: 'rgba(0,217,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: '#00d9ff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  flowCardDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  triggerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  triggerText: {
    fontSize: 12,
    color: '#888',
  },
  flowFeatures: {
    flexDirection: 'row',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,217,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#00d9ff',
  },
  playIconContainer: {
    padding: 8,
  },
  createButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    borderStyle: 'dashed',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  createButtonText: {
    fontSize: 16,
    color: '#00d9ff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.5,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  modalButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalFeatures: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  modalFeatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,217,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiBadge: {
    backgroundColor: 'rgba(0,217,255,0.1)',
  },
  briefBadge: {
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  modalFeatureText: {
    fontSize: 13,
    color: '#00d9ff',
    fontWeight: '500',
  },
  modalItemsSection: {
    width: '100%',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  modalItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalItemsList: {
    maxHeight: 200,
  },
  moreItemsText: {
    fontSize: 13,
    color: '#00d9ff',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  aiGeneratedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: 8,
  },
  aiGeneratedText: {
    fontSize: 14,
    color: '#ff9500',
    fontWeight: '500',
  },
  modalStartButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  modalStartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createModalContent: {
    width: SCREEN_WIDTH * 0.45,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  createModalIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  createModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  createModalDesc: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  createModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0,217,255,0.1)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  createModalInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#00d9ff',
    lineHeight: 20,
  },
  createModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  createModalButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createModalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default FlowsScreen;
