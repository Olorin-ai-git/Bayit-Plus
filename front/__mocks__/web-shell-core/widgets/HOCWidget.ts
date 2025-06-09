/**
 * @file
 * @description The HOCWidget component is used to fetch another plugin's widget within an AppFabric environment.
 * @example
 * import Widget from 'web-shell-core/widgets/HOCWidget';
 * import BaseWidget from 'web-shell-core/widgets/BaseWidget';
 *
 * class Hello extends BaseWidget {
 *    onComponentMount() {
 *      this.ready()
 *    }
 *
 *    render() {
 *       return (
 *          <div>
 *              <Widget id="some-other-plugin/hello@1.0.0"
 *          </div>
 *       )
 *    }
 * }
 */

let React = require('react');

// If we are in a jest test, we may have things mocked so we require the actual React
if (process.env.NODE_ENV === 'test') {
  React = jest.requireActual('react');
}

/**
 * Mock of HOCWidget for tests
 */
class HOCWidget extends React.Component {
  /**
   * Called when the widget is complete and ready to render
   * @returns {Object} `this`
   */
  ready() {
    return this;
  }

  /**
   * Called when the widget is complete and ready to render
   * @returns {Object} `this`
   */
  render() {
    return null;
  }
}

export default HOCWidget;
