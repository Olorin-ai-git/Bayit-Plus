import http.client
import json
from datetime import datetime
from typing import Any, Dict, Optional, Type

from langchain_core.callbacks import Callbacks
from langchain_core.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field

from app.models.agent_headers import IntuitHeader
from app.service.config import get_settings_for_env
from app.utils.auth_utils import get_offline_auth_token

settings_for_env = get_settings_for_env()


class OIIInput(BaseModel):
    """Input schema for the OII tool."""

    user_id: str = Field(
        ..., description="The user ID to search for online identity information"
    )

    model_config = ConfigDict(
        extra="forbid",  # This sets additionalProperties to false in the JSON schema
        json_schema_extra={"additionalProperties": False},
    )


class OIITool(BaseTool):
    """Tool for retrieving Online Identity Information (OII) from Intuit Identity API."""

    name: str = "identity_info_tool"
    description: str = """Use this tool to retrieve online identity information about a user 
    from the Intuit Identity API using GraphQL.
    You'll need to provide a user_id.
    """
    args_schema: Type[BaseModel] = OIIInput

    def _run(
        self, user_id: str, run_manager: Optional[Callbacks] = None, **kwargs: Any
    ) -> str:
        """Execute the GraphQL query to fetch identity information."""
        headers = kwargs.get("extra_headers")
        identity_data = self._query_identity_api(user_id, headers)
        return json.dumps(identity_data, indent=2)

    async def _arun(
        self, user_id: str, run_manager: Optional[Callbacks] = None, **kwargs: Any
    ) -> str:
        """Async execution of the GraphQL query."""
        headers = kwargs.get("extra_headers")
        identity_data = self._query_identity_api(user_id, headers)
        return json.dumps(identity_data, indent=2)

    def _query_identity_api(
        self, user_id: str, headers: Optional[IntuitHeader] = None
    ) -> Dict[str, Any]:
        """Query the Intuit Identity API for information about the user."""
        try:
            intuit_userid, intuit_token, intuit_realmid = get_offline_auth_token()
            conn = http.client.HTTPSConnection("identity-e2e.api.intuit.com")

            payload_template = """
            {
              "query": "query SearchAccountAndDigitalIdentityByAuthId($input: AccountInput!, $filter: Identity_DigitalIdentityByLegacyAuthIdFilter) {\\n  account(input: $input) {\\n    \\n  accountType\\n  id\\n  status\\n  namespaceId\\n  accountProfile {\\n    accountId\\n    id\\n    displayName\\n    personInfo {\\n      contactInfo {\\n        phoneNumbers {\\n          id\\n          originalNumber\\n        }\\n        emails {\\n          id\\n          email\\n        }\\n        addresses {\\n          id\\n          displayAddress {\\n            address1\\n            address2\\n            country\\n            locality\\n            phoneNumber\\n            postalCode\\n            postalExt\\n            region\\n          }\\n        }\\n      }\\n      name {\\n        familyName\\n        givenName\\n      }\\n    }\\n  }\\n\\n  }\\n  identityDigitalIdentityByLegacyAuthId(filter: $filter) {\\n    \\n  digitalIdentityId\\n  legacyAuthId\\n  pseudonymId\\n  username\\n  credentials {\\n    edges {\\n      node {\\n        __typename\\n        ... on Identity_EmailCredential {\\n          emailAddress\\n        }\\n        ... on Identity_PhoneCredential {\\n          phoneNumber\\n        }\\n        ... on Identity_PasswordCredential {\\n          __typename\\n        }\\n        ... on Identity_PiiCredential {\\n          source\\n          sourceId\\n        }\\n        ... on Identity_TotpCredential {\\n          displayName\\n        }\\n        verifications {\\n          context {\\n            date\\n          }\\n        }\\n        lastUpdated {\\n          date\\n        }\\n      }\\n    }\\n  }\\n  securityLockout {\\n    status\\n  }\\n  subscriberManagedPreferences {\\n    twoStep {\\n      enabled\\n    }\\n  }\\n  testPreferences {\\n    captchaRequired\\n    fraudRisk {\\n      eliminateWeakAuthMethods\\n    }\\n    oneTimePassword\\n    relyingPartyExpectations {\\n      digitalIdentityRefresh {\\n        credentialCollectionRequired\\n        emailRefreshRequired\\n        passwordRefreshRequired\\n        usernameRefreshRequired\\n        emailVerificationRequested {\\n          action\\n        }\\n        phoneVerificationRequested {\\n          action\\n        }\\n      }\\n      consent {\\n        irs5294\\n        shareTaxData7216\\n      }\\n    }\\n    secondaryAuthenticationChallengeRequired\\n    securityCategoryRegistration {\\n      highestGranted\\n    }\\n    sessionRecentAuthenticationGracePeriod\\n    simulateRiskIntelligenceBlock\\n  }\\n\\n  }\\n}",
              "variables": {
                "input": {
                  "id": "USER_ID"
                },
                "filter": {
                  "legacyAuthId": "USER_ID",
                  "includeLockedOut": true
                }
              }
            }
            """
            payload = payload_template.replace("USER_ID", user_id)

            request_headers = {
                "intuit_originatingip": "127.0.0.1",
                "intuit_country": "US",
                "intuit_locale": "en-US",
                "Content-Type": "application/json",
                "intuit_assetalias": "Intuit.cas.hri.gaia",
                "Authorization": f"Intuit_IAM_Authentication intuit_appid={settings_for_env.app_id}, intuit_app_secret={settings_for_env.app_secret},intuit_token_type=Intuit_IAM_Authentication intuit_realmid={intuit_realmid},intuit_token={intuit_token},intuit_token_type=IAM-Ticket,intuit_userid={intuit_userid}",
            }

            conn.request("POST", "/v2/graphql", payload, request_headers)
            response = conn.getresponse()
            data = response.read()

            api_response = json.loads(data.decode("utf-8"))

            if "errors" in api_response:
                print(f"API errors: {api_response['errors']}")

            return api_response
        except Exception as e:
            print(f"Exception in OIITool: {str(e)}")
            return {
                "data": {
                    "account": None,
                    "identityDigitalIdentityByLegacyAuthId": None,
                },
                "risk_assessment": {
                    "risk_level": 0.5,
                    "risk_factors": [
                        f"Error retrieving identity information: {str(e)}"
                    ],
                    "confidence": 0.5,
                    "timestamp": datetime.now().isoformat(),
                },
            }
