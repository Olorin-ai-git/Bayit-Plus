from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, confloat


class PhoneNumber(BaseModel):
    id: Optional[str] = None
    originalNumber: Optional[str] = None


class Email(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None


class DisplayAddress(BaseModel):
    address1: Optional[str] = None
    address2: Optional[str] = None
    country: Optional[str] = None
    locality: Optional[str] = None
    phoneNumber: Optional[str] = None
    postalCode: Optional[str] = None
    postalExt: Optional[str] = None
    region: Optional[str] = None


class Address(BaseModel):
    id: Optional[str] = None
    displayAddress: Optional[DisplayAddress] = None


class PersonName(BaseModel):
    familyName: Optional[str] = None
    givenName: Optional[str] = None


class ContactInfo(BaseModel):
    phoneNumbers: Optional[List[PhoneNumber]] = None
    emails: Optional[List[Email]] = None
    addresses: Optional[List[Address]] = Field(default_factory=list)


class PersonInfo(BaseModel):
    contactInfo: Optional[ContactInfo] = None
    name: Optional[PersonName] = None


class AccountProfile(BaseModel):
    accountId: Optional[str] = None
    id: Optional[str] = None
    displayName: Optional[str] = None
    personInfo: Optional[PersonInfo] = None


class Account(BaseModel):
    accountType: Optional[str] = None
    id: Optional[str] = None
    status: Optional[str] = None
    namespaceId: Optional[str] = None
    accountProfile: Optional[AccountProfile] = None


class Context(BaseModel):
    date: Optional[str] = None


class Verification(BaseModel):
    context: Optional[Context] = None


class LastUpdated(BaseModel):
    date: Optional[str] = None


class CredentialNode(BaseModel):
    __typename: Optional[str] = None
    emailAddress: Optional[str] = None
    phoneNumber: Optional[str] = None
    source: Optional[str] = None
    sourceId: Optional[str] = None
    displayName: Optional[str] = None  # Added for TotpCredential
    verifications: Optional[List[Verification]] = None
    lastUpdated: Optional[LastUpdated] = None


class CredentialEdge(BaseModel):
    node: Optional[CredentialNode] = None


class Credentials(BaseModel):
    edges: Optional[List[CredentialEdge]] = None


class SecurityLockout(BaseModel):
    status: Optional[str] = None


class TwoStep(BaseModel):
    enabled: Optional[bool] = None


class SubscriberManagedPreferences(BaseModel):
    twoStep: Optional[TwoStep] = None


class EmailVerificationRequested(BaseModel):
    action: Optional[str] = None


class PhoneVerificationRequested(BaseModel):
    action: Optional[str] = None


class DigitalIdentityRefresh(BaseModel):
    credentialCollectionRequired: Optional[bool] = None
    emailRefreshRequired: Optional[bool] = None
    passwordRefreshRequired: Optional[bool] = None
    usernameRefreshRequired: Optional[bool] = None
    emailVerificationRequested: Optional[EmailVerificationRequested] = None
    phoneVerificationRequested: Optional[PhoneVerificationRequested] = None


class Consent(BaseModel):
    irs5294: Optional[bool] = None
    shareTaxData7216: Optional[bool] = None


class RelyingPartyExpectations(BaseModel):
    digitalIdentityRefresh: Optional[DigitalIdentityRefresh] = None
    consent: Optional[Consent] = None


class FraudRisk(BaseModel):
    eliminateWeakAuthMethods: Optional[bool] = None


class SecurityCategoryRegistration(BaseModel):
    highestGranted: Optional[str] = None


class TestPreferences(BaseModel):
    captchaRequired: Optional[bool] = None
    fraudRisk: Optional[FraudRisk] = None
    oneTimePassword: Optional[bool] = None
    relyingPartyExpectations: Optional[RelyingPartyExpectations] = None
    secondaryAuthenticationChallengeRequired: Optional[bool] = None
    securityCategoryRegistration: Optional[SecurityCategoryRegistration] = None
    sessionRecentAuthenticationGracePeriod: Optional[bool] = None
    simulateRiskIntelligenceBlock: Optional[bool] = None


class IdentityDigitalIdentity(BaseModel):
    digitalIdentityId: Optional[str] = None
    legacyAuthId: Optional[str] = None
    pseudonymId: Optional[str] = None
    username: Optional[str] = None
    credentials: Optional[Credentials] = None
    securityLockout: Optional[SecurityLockout] = None
    subscriberManagedPreferences: Optional[SubscriberManagedPreferences] = None
    testPreferences: Optional[TestPreferences] = None


class OIIData(BaseModel):
    account: Optional[Account] = None
    identityDigitalIdentityByLegacyAuthId: Optional[IdentityDigitalIdentity] = None


class ErrorExtensions(BaseModel):
    errorType: Optional[str] = None
    legacyPath: Optional[List[str]] = None
    service: Optional[str] = None


class Error(BaseModel):
    message: Optional[str] = None
    path: Optional[List[Any]] = None
    extensions: Optional[ErrorExtensions] = None


class OIIResponse(BaseModel):
    data: Optional[OIIData] = None
    errors: Optional[List[Error]] = None
