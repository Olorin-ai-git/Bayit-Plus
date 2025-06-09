import React from 'react';
import BaseWidget, { BaseWidgetProps } from 'web-shell-core/widgets/BaseWidget';
import { SandboxContextProvider } from '@appfabric/providers';
import InvestigationPage from 'src/js/pages/InvestigationPage';
import Investigations from 'src/js/pages/Investigations';
import NavigationBar from 'src/js/components/NavigationBar';
import SettingsPage from 'src/js/pages/Settings';
import 'src/sass/tailwind.css';

// remove white borders
document.body.style.margin = '0px';
document.documentElement.style.overflowY = 'hidden';

/**
 * Fetches some data.
 * @param {BaseWidget<BaseWidgetProps>} widget - The widget instance that will be marked as ready.
 * @returns {void}
 */
/**
 * Fetches critical data.
 * @returns {Promise<string>} A promise that resolves to a string.
 */
const fetchCriticalData = async (): Promise<string> =>
  Promise.resolve('this is a sample response from the API call');

type GaiaWidgetState = {
  activeTab: 'investigation' | 'investigations' | 'settings';
  currentInvestigationId: string | null;
};

/**
 * Gets the investigationId from the current URL query parameters.
 * @returns {string | null} The investigationId if present, otherwise null.
 */
function getInvestigationIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('investigationId');
}

/**
 * Sets the investigationId in the current URL query parameters.
 * @param {string} id - The investigation ID to set in the URL.
 */
function setInvestigationIdInUrl(id: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('investigationId', id);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/** Basic plugin class */
class GaiaWidget extends BaseWidget<BaseWidgetProps, GaiaWidgetState> {
  /**
   * initializes component
   * @param {object} props : component props
   * @returns {void}
   */
  constructor(props: BaseWidgetProps) {
    super(props);
    this.state = {
      activeTab: 'investigation',
      currentInvestigationId: null,
    };
    this.handleWidgetDone = this.handleWidgetDone.bind(this);
    this.handleWidgetError = this.handleWidgetError.bind(this);
  }

  /**
   * Mounts the component, see React docs.
   * @returns {void}
   */
  componentDidMount() {
    const { sandbox } = this.props;
    // eslint-disable-next-line no-unused-vars
    fetchCriticalData().then((responseData) => {
      // you can use the responseData as needed

      // now that we have critical data available, we can mark the widget as ready
      this.ready();

      // Note: Invoking this.ready() is essential to indicate that the widget is now ready,
      // without which AppFabric shell wouldn't be able to render the widget.
      // Read more here: http://in/appfabric-widget-ready-marker
    });
    sandbox.logger.log('gaia widget mounted.');
  }

  /**
   * This method will invoke the onDone callback provided by the consumer through the onDone
   * property with the given params. If the consumer does not provide the
   * onDone callback, this method will be a no op.
   * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/reference/widgets.md#instance-methods
   * @returns {void}
   */
  handleWidgetDone() {
    this.done();
  }

  /**
   * This method will invoke the onError callback provided by the consumer
   * through the onError property with the Error. If the consumer does not
   * provide the onError callback, this method will be a no op.
   * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/reference/widgets.md#instance-methods
   * @param {string} error: error string
   * @returns {void}
   */
  handleWidgetError(error: string) {
    this.err(error);
  }

  /**
   * Handles creation of a new investigation and updates the state and URL.
   * @param {string} newId - The new investigation ID.
   */
  handleCreateInvestigation = (newId: string) => {
    setInvestigationIdInUrl(newId);
    this.setState({
      activeTab: 'investigation',
      currentInvestigationId: newId,
    });
  };

  /**
   * Renders the plugin
   * We use the image that we imported above so it is handled in the browser when the plugin is loaded
   * @returns {void}
   */
  render() {
    const { sandbox } = this.props;

    return (
      <SandboxContextProvider sandbox={sandbox}>
        <div className="flex flex-row h-screen">
          <div className="flex-1" data-cy="gaia-webplugin-div">
            {this.state.activeTab === 'investigation' && (
              <InvestigationPage
                investigationId={this.state.currentInvestigationId}
              />
            )}
            {this.state.activeTab === 'investigations' && (
              <Investigations
                onCreateInvestigation={(id: string) => {
                  this.setState({ currentInvestigationId: id });
                  this.setState({ activeTab: 'investigation' });
                }}
              />
            )}
            {this.state.activeTab === 'settings' && <SettingsPage />}
          </div>
          <NavigationBar
            activeTab={this.state.activeTab}
            onTabChange={(
              tab: 'investigation' | 'investigations' | 'settings',
            ) => {
              const currentPath = window.location.pathname;
              const basePath = currentPath.replace(/\/(settings|investigations)$/, '');
              if (tab === 'investigations') {
                window.history.replaceState({}, '', basePath);
                this.setState({ activeTab: tab, currentInvestigationId: null });
              } else if (tab === 'settings') {
                const search = window.location.search;
                window.history.replaceState({}, '', `${basePath}/settings${search}`);
                this.setState({ activeTab: 'settings' });
              } else {
                const { currentInvestigationId } = this.state;
                if (currentInvestigationId) {
                  const params = new URLSearchParams(window.location.search);
                  params.set('investigationId', currentInvestigationId);
                  window.history.replaceState({}, '', `${basePath}?${params.toString()}`);
                } else {
                  window.history.replaceState({}, '', basePath);
                }
                this.setState({ activeTab: tab });
              }
            }}
          />
        </div>
      </SandboxContextProvider>
    );
  }
}

export default GaiaWidget;
