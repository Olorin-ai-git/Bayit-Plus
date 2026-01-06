import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './FlowsPage.css';

const FLOW_ICONS = {
  'טקס בוקר': { icon: '☀️', gradient: 'linear-gradient(135deg, #ff9500, #ff6b00)' },
  'ליל שבת': { icon: '🕯️', gradient: 'linear-gradient(135deg, #5856d6, #8b5cf6)' },
  'שעת שינה': { icon: '🌙', gradient: 'linear-gradient(135deg, #1a1a2e, #4a4a8a)' },
  'זמן ילדים': { icon: '🎈', gradient: 'linear-gradient(135deg, #ff2d55, #ff6b9d)' },
};

const FlowsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [flows, setFlows] = useState([]);
  const [activeFlow, setActiveFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchFlows();
  }, []);

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

  const getLocalizedName = (flow) => {
    const lang = i18n.language;
    if (lang === 'en' && flow.name_en) return flow.name_en;
    if (lang === 'es' && flow.name_es) return flow.name_es;
    return flow.name;
  };

  const getFlowIcon = (flow) => {
    return FLOW_ICONS[flow.name] || { icon: '▶️', gradient: 'linear-gradient(135deg, #00d9ff, #0099cc)' };
  };

  const formatTriggerTime = (trigger) => {
    if (trigger.type === 'shabbat') {
      return t('flows.shabbatTrigger', 'Shabbat evening');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return '';
  };

  const handleStartFlow = async (flow) => {
    try {
      const response = await api.get(`/flows/${flow.id}/content`);
      if (response.data.content && response.data.content.length > 0) {
        navigate('/player', {
          state: {
            flowId: flow.id,
            flowName: getLocalizedName(flow),
            playlist: response.data.content,
            aiBrief: response.data.ai_brief,
          },
        });
      } else {
        setSelectedFlow(flow);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error starting flow:', error);
    }
  };

  const handleSkipToday = async (flow) => {
    try {
      await api.post(`/flows/${flow.id}/skip-today`);
      setActiveFlow(null);
    } catch (error) {
      console.error('Error skipping flow:', error);
    }
  };

  if (loading) {
    return (
      <div className="flows-page">
        <div className="flows-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const systemFlows = flows.filter(f => f.flow_type === 'system');
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <div className="flows-page">
      <div className="flows-container">
        {/* Header */}
        <div className="flows-header">
          <h1>{t('flows.title', 'Flows')}</h1>
          <p>{t('flows.subtitle', 'Curated content experiences for every moment')}</p>
        </div>

        {/* Active Flow Banner */}
        {activeFlow && (
          <div className="active-flow-banner">
            <div
              className="active-flow-icon"
              style={{ background: getFlowIcon(activeFlow).gradient }}
            >
              <span>{getFlowIcon(activeFlow).icon}</span>
            </div>
            <div className="active-flow-content">
              <span className="active-label">{t('flows.activeNow', 'Active Now')}</span>
              <h3>{getLocalizedName(activeFlow)}</h3>
              {activeFlow.description && <p>{activeFlow.description}</p>}
            </div>
            <div className="active-flow-actions">
              <button
                className="start-btn"
                onClick={() => handleStartFlow(activeFlow)}
              >
                <span className="play-icon">▶</span>
                {t('flows.start', 'Start')}
              </button>
              <button
                className="skip-btn"
                onClick={() => handleSkipToday(activeFlow)}
              >
                {t('flows.skipToday', 'Skip Today')}
              </button>
            </div>
          </div>
        )}

        {/* System Flows */}
        <section className="flows-section">
          <h2>{t('flows.systemFlows', 'Ready-Made Flows')}</h2>
          <div className="flows-grid">
            {systemFlows.map((flow) => (
              <div
                key={flow.id}
                className="flow-card"
                onClick={() => handleStartFlow(flow)}
              >
                <div
                  className="flow-icon"
                  style={{ background: getFlowIcon(flow).gradient }}
                >
                  <span>{getFlowIcon(flow).icon}</span>
                </div>
                <div className="flow-content">
                  <div className="flow-header">
                    <h3>{getLocalizedName(flow)}</h3>
                    <span className="system-badge">{t('flows.system', 'System')}</span>
                  </div>
                  {flow.description && (
                    <p className="flow-desc">{flow.description}</p>
                  )}
                  {flow.triggers.length > 0 && (
                    <div className="trigger-info">
                      <span className="clock-icon">🕐</span>
                      <span>{formatTriggerTime(flow.triggers[0])}</span>
                    </div>
                  )}
                  <div className="flow-features">
                    {flow.ai_enabled && (
                      <span className="feature-badge">
                        <span className="sparkle">✨</span> AI
                      </span>
                    )}
                    {flow.auto_play && (
                      <span className="feature-badge">
                        <span className="auto-icon">▶️</span> {t('flows.autoPlay', 'Auto')}
                      </span>
                    )}
                    {flow.items.length > 0 && (
                      <span className="feature-badge">
                        <span className="list-icon">📋</span> {flow.items.length} {t('flows.items', 'items')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flow-arrow">→</div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Flows */}
        {customFlows.length > 0 && (
          <section className="flows-section">
            <h2>{t('flows.customFlows', 'My Flows')}</h2>
            <div className="flows-grid">
              {customFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="flow-card"
                  onClick={() => handleStartFlow(flow)}
                >
                  <div
                    className="flow-icon"
                    style={{ background: getFlowIcon(flow).gradient }}
                  >
                    <span>{getFlowIcon(flow).icon}</span>
                  </div>
                  <div className="flow-content">
                    <div className="flow-header">
                      <h3>{getLocalizedName(flow)}</h3>
                    </div>
                    {flow.description && (
                      <p className="flow-desc">{flow.description}</p>
                    )}
                    {flow.triggers.length > 0 && (
                      <div className="trigger-info">
                        <span className="clock-icon">🕐</span>
                        <span>{formatTriggerTime(flow.triggers[0])}</span>
                      </div>
                    )}
                  </div>
                  <div className="flow-arrow">→</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create Flow Button */}
        <button className="create-flow-btn">
          <span className="plus-icon">+</span>
          {t('flows.createCustom', 'Create Custom Flow')}
        </button>
      </div>

      {/* Flow Detail Modal */}
      {showModal && selectedFlow && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-icon"
              style={{ background: getFlowIcon(selectedFlow).gradient }}
            >
              <span>{getFlowIcon(selectedFlow).icon}</span>
            </div>
            <h2>{getLocalizedName(selectedFlow)}</h2>
            {selectedFlow.description && <p className="modal-desc">{selectedFlow.description}</p>}

            <div className="modal-info">
              <div className="info-row">
                <span className="info-label">{t('flows.type', 'Type')}:</span>
                <span className="info-value">
                  {selectedFlow.flow_type === 'system'
                    ? t('flows.systemFlow', 'System Flow')
                    : t('flows.customFlow', 'Custom Flow')}
                </span>
              </div>
              {selectedFlow.triggers.length > 0 && (
                <div className="info-row">
                  <span className="info-label">{t('flows.schedule', 'Schedule')}:</span>
                  <span className="info-value">{formatTriggerTime(selectedFlow.triggers[0])}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">{t('flows.content', 'Content')}:</span>
                <span className="info-value">
                  {selectedFlow.items.length > 0
                    ? `${selectedFlow.items.length} ${t('flows.items', 'items')}`
                    : t('flows.aiGenerated', 'AI Generated')}
                </span>
              </div>
            </div>

            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowsPage;
