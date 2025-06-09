import React, { ReactNode } from 'react';
import styled from 'styled-components';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

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
  text: string;
  newPath: string;
}

/** getOverrideButton function
 * @param {OverrideButtonProps} props - the component props
 * @returns {JSX.Element} returns a button
 */
const OverrideButton = ({ text }: OverrideButtonProps) => (
  <Button
    variant="outlined"
    size="small"
    sx={{ textTransform: 'none' }}
  >
    {text}
  </Button>
);

const HelpInfo: React.FC = () => (
  <StyledInfoContainer>
    <StyledHR />
    <h3>Help Info</h3>
    <StyledInfoSection>
      <OverrideButton text="Set a Local Plugin Override" newPath="pluginDevTool" />{' '}
      or type{' '}
      <StyledKeyContainer>
        <Chip label="control" color="info" size="small" /> <Chip label="+" color="default" size="small" />{' '}
        <Chip label="option" color="info" size="small" /> <Chip label="+" color="default" size="small" />{' '}
        <Chip label="q" color="info" size="small" />{' '}
      </StyledKeyContainer>
    </StyledInfoSection>
    <StyledInfoSection>
      <OverrideButton text="Set a Local App Override" newPath="appDevTools" />{' '}
      or type{' '}
      <StyledKeyContainer>
        <Chip label="control" color="info" size="small" /> <Chip label="+" color="default" size="small" />{' '}
        <Chip label="option" color="info" size="small" /> <Chip label="+" color="default" size="small" />{' '}
        <Chip label="=" color="info" size="small" />{' '}
      </StyledKeyContainer>
    </StyledInfoSection>
    <StyledInfoSection>
      For more information, please visit the{' '}
      <NewTabLink href="#">
        Documentation
      </NewTabLink>{' '}
      and{' '}
      <NewTabLink href="#">
        CLI docs
      </NewTabLink>
      .
    </StyledInfoSection>
    <StyledInfoSection>
      Check out our{' '}
      <NewTabLink href="#">
        Playground App
      </NewTabLink>{' '}
      for code examples or the{' '}
      <NewTabLink href="#">
        Storybook
      </NewTabLink>{' '}
      for a component playground.
    </StyledInfoSection>
    <StyledInfoSection>
      For support, search{' '}
      <NewTabLink href="#">
        Stack Overflow
      </NewTabLink>{' '}
      or search or post in{' '}
      <NewTabLink href="#">
        #support
      </NewTabLink>{' '}
      or{' '}
      <NewTabLink href="#">
        #help
      </NewTabLink>
      .
    </StyledInfoSection>
  </StyledInfoContainer>
);

export default HelpInfo;
