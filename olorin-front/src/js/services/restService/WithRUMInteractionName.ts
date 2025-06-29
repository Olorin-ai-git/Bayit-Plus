/* eslint-disable require-jsdoc */

/**
 * An abstract class to define the RUM interaction name method
 */
abstract class WithRUMInteractionName {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public getRUMInteractionName(action: string): string {
    return `${this.name} ${action}`.replace(/\//g, '_');
  }
}
/* eslint-enable require-jsdoc */

export default WithRUMInteractionName;
