import React, { useState, useEffect, useRef } from 'react';
import { useSandboxContext } from '@appfabric/providers';
import styled from 'styled-components';
import Button from '@ids-ts/button';
import TextField from '@ids-ts/text-field';
import { CircleCheck } from '@design-systems/icons';
import { Profiler, CustomerInteraction } from '@appfabric/sandbox-spec';

const StyledForm = styled.form`
  width: 25rem;
`;

const StyledButton = styled(Button)`
  margin-top: 0.5rem !important;
`;

const StyledHeading = styled.h3`
  margin: 2.5rem 0;
  color: rgb(0, 128, 128);
`;

const StyledInput = styled(TextField)`
  margin-bottom: 1rem;
`;

type Props = {
  onWidgetDone: (result: unknown) => void;
  onWidgetError: (error: Error | string) => void;
};

type ProfilerRef = {
  current: undefined | Profiler;
};

type InteractionRef = {
  current: undefined | CustomerInteraction;
};

/** UserInfoForm component
 * @returns {JSX.Element} returns UserInfoForm JSX element
 */
const UserInfoForm: React.FC<Props> = ({ onWidgetDone, onWidgetError }) => {
  const sandbox = useSandboxContext();
  const [isRegistered, setRegistered] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isInvalidName, setIsInvalidName] = useState(false);
  const [isInvalidEmail, setIsInvalidEmail] = useState(false);
  const [interactionCounter, setInteractionCounter] = useState(1);

  /** creating profiler instance variable using ref hook.
   * For more info: https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
   * In this example, profiler is used to record the total time taken to complete registration.
   */
  const profiler: ProfilerRef = useRef();

  /** creating customer interaction instance variable using ref hook.
   * For more info: https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
   * In this example, customer interaction is used to record failed and successful interactions.
   */
  const interaction: InteractionRef = useRef();

  /** here, instance variables will be initialized only once since sandbox.performance won't change */
  useEffect(() => {
    /** initialize interaction instance variable with a customer interaction record with the given name
     * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/rum/getting-started/web.md
     */
    interaction.current = sandbox.performance.createCustomerInteraction(
      'user_form_interaction_1',
    );

    /** initialize profiler instance variable with a profiler record with the given name
     * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/rum/getting-started/web.md#custom-metric-instrumentation
     */
    profiler.current = sandbox.performance.createProfiler('user_form_profiler');
    /** start the timer */
    profiler.current.start();
    /** mark start of registration process */
    profiler.current.mark('registration');
  }, [sandbox.performance]);

  /**
   * measures the registration process, ends and
   * records the timer on successful registration
   * @returns {void}
   */
  const recordProfiler = () => {
    /** measure the end of registration process */
    profiler.current!.measure('registration');
    /** end the timer */
    profiler.current!.end('registration_total_time');
    /** record the timer */
    sandbox.performance.record(profiler.current!);
  };

  /**
   * handles registration failure
   * @returns {void}
   */
  const handleRegistrationFailure = () => {
    // handle failure scenario here

    /** log ERROR message with given properties
     * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/reference/sandbox/sandbox-usage.md#logging
     */
    sandbox.logger.error('error_registering_user', {
      reason: 'invalid_inputs',
    });

    /** call widget error callback handler */
    onWidgetError('invalid_inputs');

    /** mark the interaction as failed and send the metrics */
    interaction.current!.fail('invalid_inputs');
    sandbox.performance.record(interaction.current!);
    /** create a new customer interaction as previous one has been ended and recorded */
    interaction.current = sandbox.performance.createCustomerInteraction(
      `user_form_interaction_${interactionCounter + 1}`,
    );
    /** increment interaction counter so that next time interaction is created with a new name */
    setInteractionCounter(interactionCounter + 1);
  };

  /**
   * handles registration success
   * @returns {void}
   */
  const handleRegistrationSuccess = () => {
    // handle success scenario here

    /** track the registration success event
     * For more info: https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/reference/sandbox/sandbox-usage.md
     */
    sandbox.analytics.track({
      event: 'success',
      type: 'track',
      action: 'user_registration',
      scope_area: 'user_form',
      screen: 'user_widget',
      object: 'document',
    });

    /** trigger profiler record process */
    recordProfiler();

    /** call widget done callback handler */
    onWidgetDone(null);

    /** mark the interaction as success and send the metrics */
    interaction.current!.success();
    sandbox.performance.record(interaction.current!);
  };

  /**
   * handles form submit
   * @param {React.FormEvent} e: form event
   * @returns {void}
   */
  const handleFormOnSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistered) {
      return;
    }

    /** handle inputs validation */
    const nameError = !name;
    const emailError = !email.endsWith('@intuit.com');
    setIsInvalidName(nameError);
    setIsInvalidEmail(emailError);

    /** handle registration failure */
    if (emailError || nameError) {
      handleRegistrationFailure();
      return;
    }

    /** handle registration success */
    setRegistered(true);
    handleRegistrationSuccess();
  };

  /**
   * handles name change
   * @param {React.FormEvent} e: form event
   * @returns {void}
   */
  const handleNameOnChange = (e: React.ChangeEvent) => {
    const { target } = e;
    setName((target as HTMLInputElement).value);
  };

  /**
   * handles email change
   * @param {React.FormEvent} e: form event
   * @returns {void}
   */
  const handleEmailOnChange = (e: React.ChangeEvent) => {
    const { target } = e;
    setEmail((target as HTMLInputElement).value);
  };

  return (
    <>
      <StyledHeading>Example Register form</StyledHeading>
      <StyledForm onSubmit={handleFormOnSubmit}>
        <StyledInput
          value={name}
          label="Name*"
          placeholder="user name"
          onChange={handleNameOnChange}
          errorText={isInvalidName ? 'Name is required' : ''}
          aria-label="name"
        />
        <StyledInput
          value={email}
          label="Email*"
          placeholder="useremail@intuit.com"
          onChange={handleEmailOnChange}
          errorText={isInvalidEmail ? 'Email must end with @intuit.com' : ''}
          aria-label="email"
        />
        <StyledButton
          type="submit"
          size="medium"
          automationId="idsButtonComponent"
        >
          {isRegistered ? 'Registered' : 'Register'}
          {isRegistered && <CircleCheck size="small" />}
        </StyledButton>
      </StyledForm>
    </>
  );
};

export default UserInfoForm;
