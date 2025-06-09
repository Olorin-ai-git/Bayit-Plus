import React, { ReactNode } from 'react';
import Button from '@ids-ts/button';
import styled from 'styled-components';
import { Badge } from '@ids-ts/badge';
import type { Sandbox } from '@appfabric/sandbox-spec';

const StyledHR = styled.hr`
  border: 0;
  border-top: 1px solid grey;
`;

const StyledInfoContainer = styled.section`
  margin-top: 2rem;
`;

const StyledLink = styled.a`
  active: #0077c5;
  color: #0077c5;
  focus: #0077c5;
  hover: #0077c5;
  visited: #0077c5;
`;

const StyledKeyContainer = styled.span`
  display: inline-flex;
  gap: 3px;
`;

const StyledInfoSection = styled.div`
  margin: 1em 0;
`;

interface NewTabLinkProps {
  href: string;
  children: ReactNode;
}

/** NewTabLink component
 * @param {NewTabLinkProps} props - the component props
 * @returns {JSX.Element} returns a styled link which opens in a new tab
 */
const NewTabLink = ({ href, children }: NewTabLinkProps) => (
  <StyledLink href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </StyledLink>
);

interface OverrideButtonProps {
  sandbox: Sandbox;
  text: string;
  newPath: string;
}

/** getOverrideButton function
 * @param {OverrideButtonProps} props - the component props
 * @returns {JSX.Element} returns a button
 */
const OverrideButton = ({ sandbox, text, newPath }: OverrideButtonProps) => (
  <Button
    priority="secondary"
    size="small"
    type="button"
    onClick={() => sandbox.navigation.navigate(newPath)}
  >
    {text}
  </Button>
);

interface HelpInfoProps {
  sandbox: Sandbox;
}

/** HelpInfo component
 * @param {HelpInfoProps} props - the component props
 * @returns {JSX.Element} returns HelpInfo JSX element
 */
const HelpInfo: React.FC<HelpInfoProps> = ({ sandbox }) => (
  <StyledInfoContainer>
    <StyledHR />
    <h3>Help Info</h3>
    <StyledInfoSection>
      <OverrideButton
        sandbox={sandbox}
        text="Set a Local Plugin Override"
        newPath="pluginDevTool"
      />{' '}
      or type{' '}
      <StyledKeyContainer>
        <Badge status="info">control</Badge> <Badge status="pending">+</Badge>{' '}
        <Badge status="info">option</Badge> <Badge status="pending">+</Badge>{' '}
        <Badge status="info">q</Badge>{' '}
      </StyledKeyContainer>
    </StyledInfoSection>
    <StyledInfoSection>
      <OverrideButton
        sandbox={sandbox}
        text="Set a Local App Override"
        newPath="appDevTools"
      />{' '}
      or type{' '}
      <StyledKeyContainer>
        <Badge status="info">control</Badge> <Badge status="pending">+</Badge>{' '}
        <Badge status="info">option</Badge> <Badge status="pending">+</Badge>{' '}
        <Badge status="info">=</Badge>{' '}
      </StyledKeyContainer>
    </StyledInfoSection>
    <StyledInfoSection>
      For more information, please visit the{' '}
      <NewTabLink href="https://devportal.intuit.com/app/dp/capability/2611/capabilityDocs/main/docs/overview.md">
        AppFabric docs
      </NewTabLink>{' '}
      and{' '}
      <NewTabLink href="https://github.intuit.com/pages/UX-Infra/plugin-cli/#/">
        plugin-cli docs
      </NewTabLink>
      .
    </StyledInfoSection>
    <StyledInfoSection>
      Check out our{' '}
      <NewTabLink href="https://appfabric-playground.app.intuit.com/">
        Playground App
      </NewTabLink>{' '}
      for sandbox code examples or the{' '}
      <NewTabLink href="https://uxfabric.intuitcdn.net/internal/design-systems/ids-web/main/latest/index.html">
        IDS Storybook
      </NewTabLink>{' '}
      for a component playground.
    </StyledInfoSection>
    <StyledInfoSection>
      For support, search{' '}
      <NewTabLink href="https://stackoverflow.intuit.com/">
        Intuit&rsquo;s Stack Overflow
      </NewTabLink>{' '}
      or search or post in{' '}
      <NewTabLink href="https://intuit-teams.slack.com/archives/C3JK09N5D">
        #tm-appfabric
      </NewTabLink>{' '}
      or{' '}
      <NewTabLink href="https://intuit-teams.slack.com/archives/C53V5U3S5">
        #ask-ids
      </NewTabLink>
      .
    </StyledInfoSection>
  </StyledInfoContainer>
);

export default HelpInfo;
