import React from 'react';
import { Sandbox } from '../../services/envConstants';
import InvestigationPage from '../../pages/InvestigationPage';
import Investigations from '../../pages/Investigations';
import NavigationBar from '../../components/NavigationBar';
import SettingsPage from '../../pages/Settings';
import MCPPage from '../../pages/MCPPage';

interface OlorinWidgetProps {
  sandbox: Sandbox;
}

interface OlorinWidgetState {
  isVisible: boolean;
  investigationId: string | null;
  userId: string;
  entityType: string;
  activeTab: 'investigation' | 'investigations' | 'settings' | 'mcp';
}

/**
 * Olorin Widget - Main widget component for the Olorin investigation system
 */
class OlorinWidget extends React.Component<OlorinWidgetProps, OlorinWidgetState> {
  constructor(props: OlorinWidgetProps) {
    super(props);
    
    this.state = {
      isVisible: true,
      investigationId: null,
      userId: 'test-user-123',
      entityType: 'user_id',
      activeTab: 'investigation',
    };
  }

  componentDidMount() {
    const { sandbox } = this.props;
    sandbox.logger?.log('olorin widget mounted.');
    
    // Listen for messages from the parent application
    if (sandbox.on) {
      sandbox.on('message', this.handleMessage);
    }
  }

  componentWillUnmount() {
    const { sandbox } = this.props;
    if (sandbox.off) {
      sandbox.off('message', this.handleMessage);
    }
  }

  /**
   * Handle incoming messages from the parent application
   */
  handleMessage = (message: any) => {
    const { sandbox } = this.props;
    
    switch (message.type) {
      case 'START_INVESTIGATION':
        this.setState({
          investigationId: message.investigationId,
          userId: message.userId || this.state.userId,
          entityType: message.entityType || this.state.entityType,
        });
        sandbox.logger?.log(`Investigation started: ${JSON.stringify(message)}`);
        break;
        
      case 'UPDATE_USER':
        this.setState({
          userId: message.userId,
          entityType: message.entityType,
        });
        sandbox.logger?.log(`Message received: ${JSON.stringify(message)}`);
        break;
        
      case 'TOGGLE_VISIBILITY':
        this.setState({ isVisible: !this.state.isVisible });
        break;
        
      default:
        sandbox.logger?.log(`Unknown message type: ${message.type}`);
    }
  };

  /**
   * Initialize the widget with default configuration
   */
  initializeWidget = () => {
    const { sandbox } = this.props;
    
    // Set up default configuration
    const config = {
      entityType: this.state.entityType,
      userId: this.state.userId,
    };
    
    sandbox.logger?.log(`Widget initialized with config: ${JSON.stringify(config)}`);
  };

  /**
   * Handle investigation completion
   */
  handleInvestigationComplete = (results: any) => {
    const { sandbox } = this.props;
    
    sandbox.logger?.log(`Investigation completed: ${JSON.stringify(results)}`);
    
    // Send results back to parent application
    if (sandbox.send) {
      sandbox.send('INVESTIGATION_COMPLETE', {
        investigationId: this.state.investigationId,
        results,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Handle investigation error
   */
  handleInvestigationError = (error: any) => {
    const { sandbox } = this.props;
    
    sandbox.logger?.error(`Investigation error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    
    // Send error back to parent application
    if (sandbox.send) {
      sandbox.send('INVESTIGATION_ERROR', {
        investigationId: this.state.investigationId,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      });
    }
  };

  handleTabChange = (tab: 'investigation' | 'investigations' | 'settings' | 'mcp') => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { isVisible, investigationId, userId, entityType, activeTab } = this.state;
    
    if (!isVisible) {
      return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p>Widget is hidden</p>
        </div>
      );
    }

    return (
      <div className="flex flex-row h-screen">
        <div className="flex-1" data-cy="olorin-webplugin-div">
          {activeTab === 'investigation' && (
            <InvestigationPage
              investigationId={investigationId}
            />
          )}
          {activeTab === 'investigations' && (
            <Investigations
              onCreateInvestigation={(id: string) => {
                this.setState({ investigationId: id });
                this.setState({ activeTab: 'investigation' });
              }}
            />
          )}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'mcp' && <MCPPage />}
        </div>
        <NavigationBar
          activeTab={activeTab}
          onTabChange={this.handleTabChange}
        />
      </div>
    );
  }
}

export default OlorinWidget;
