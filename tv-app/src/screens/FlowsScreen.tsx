import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { useProfile } from '../contexts/ProfileContext';
import api from '../services/api';

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
  type: string;
  start_time?: string;
  end_time?: string;
  days?: number[];
  skip_shabbat: boolean;
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
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { currentProfile } = useProfile();

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
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
      return t('flows.shabbatTrigger', 'Shabbat evening');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return '';
  };

  const renderActiveFlowBanner = () => {
    if (!activeFlow) return null;

    const iconConfig = getFlowIcon(activeFlow);
    const glowColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(107, 33, 168, 0.3)', 'rgba(168, 85, 247, 0.6)'],
    });

    return (
      <Animated.View style={[styles.activeBanner, { shadowColor: '#a855f7', shadowOpacity: glowAnim }]}>
        <LinearGradient
          colors={['rgba(107, 33, 168, 0.3)', 'rgba(107, 33, 168, 0.15)']}
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
                colors={['#a855f7', '#0099cc']}
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
                  <Ionicons name="sparkles" size={12} color="#a855f7" />
                  <Text style={styles.featureText}>AI</Text>
                </View>
              )}
              {flow.auto_play && (
                <View style={styles.featureBadge}>
                  <Ionicons name="play-circle" size={12} color="#a855f7" />
                  <Text style={styles.featureText}>{t('flows.autoPlay', 'Auto')}</Text>
                </View>
              )}
              {flow.items.length > 0 && (
                <View style={styles.featureBadge}>
                  <Ionicons name="list" size={12} color="#a855f7" />
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
                <Text style={styles.modalInfoLabel}>{t('flows.type', 'Type')}:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedFlow.flow_type === 'system'
                    ? t('flows.systemFlow', 'System Flow')
                    : t('flows.customFlow', 'Custom Flow')}
                </Text>
              </View>

              {selectedFlow.triggers.length > 0 && (
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>{t('flows.schedule', 'Schedule')}:</Text>
                  <Text style={styles.modalInfoValue}>
                    {formatTriggerTime(selectedFlow.triggers[0])}
                  </Text>
                </View>
              )}

              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoLabel}>{t('flows.content', 'Content')}:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedFlow.items.length > 0
                    ? `${selectedFlow.items.length} ${t('flows.items', 'items')}`
                    : t('flows.aiGenerated', 'AI Generated')}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowFlowModal(false)}
                >
                  <Text style={styles.modalButtonText}>{t('common.close', 'Close')}</Text>
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
        <ActivityIndicator size="large" color="#a855f7" />
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
        <TouchableOpacity style={styles.createButton}>
          <LinearGradient
            colors={['rgba(107, 33, 168, 0.3)', 'rgba(107, 33, 168, 0.15)']}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add-circle-outline" size={24} color="#a855f7" />
            <Text style={styles.createButtonText}>
              {t('flows.createCustom', 'Create Custom Flow')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {renderFlowModal()}
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
    borderColor: 'rgba(168, 85, 247, 0.6)',
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
    color: '#a855f7',
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
    borderColor: '#a855f7',
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: '#a855f7',
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#a855f7',
  },
  playIconContainer: {
    padding: 8,
  },
  createButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
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
    color: '#a855f7',
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
});

export default FlowsScreen;
