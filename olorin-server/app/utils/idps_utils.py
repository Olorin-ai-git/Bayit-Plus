try:
    from idps_sdk.idps_client import IdpsClientFactory
except ImportError:
    IdpsClientFactory = None

from app.service.config import LocalSettings, SvcSettings, get_settings_for_env

_app_secrets: dict = {}


def _getIdpsClient(settings: SvcSettings):
    _is_local_environment = isinstance(settings, LocalSettings)
    if _is_local_environment:
        return IdpsClientFactory.get_instance(
            endpoint=settings.idps_endpoint,
            resource_asset_id=settings.asset_id,
        )
    return IdpsClientFactory.get_instance(
        endpoint=settings.idps_endpoint, policy_id=settings.idps_policy_id
    )


def get_app_secret(secret_to_get):
    settings = get_settings_for_env()
    global _app_secrets
    if secret_to_get not in _app_secrets:
        client = _getIdpsClient(settings)
        _app_secrets[secret_to_get] = client.get_secret(
            secret_to_get
        ).get_string_value()
    return _app_secrets[secret_to_get]
