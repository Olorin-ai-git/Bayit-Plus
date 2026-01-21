# Autenticacion

El API de Bayit+ utiliza JWT (JSON Web Tokens) para la autenticacion. Esta guia cubre la obtencion de tokens, flujos OAuth 2.0 y procedimientos de renovacion de tokens.

## Metodos de Autenticacion

| Metodo | Caso de Uso |
|--------|-------------|
| OAuth 2.0 | Aplicaciones orientadas al usuario |
| API Keys | Integracion servidor a servidor |
| Cuentas de Servicio | Automatizacion de backend |

## Flujo de Codigo de Autorizacion OAuth 2.0

Para aplicaciones que acceden a datos de usuario:

**Paso 1**: Redirige al usuario al endpoint de autorizacion:

```
GET https://auth.bayit.plus/oauth/authorize
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &response_type=code
  &scope=read:content read:profile
  &state={random_state}
```

**Paso 2**: Intercambia el codigo de autorizacion por tokens:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&redirect_uri={redirect_uri}
&client_id={client_id}
&client_secret={client_secret}
```

**Paso 3**: Recibe los tokens de acceso y actualizacion:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "dGhp...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:content read:profile"
}
```

## Uso de Tokens de Acceso

Incluye el token de acceso en el encabezado Authorization:

```
GET /v1/content/movies
Authorization: Bearer eyJ...
```

## Renovacion de Token

Los tokens de acceso expiran despues de una hora. Usa el token de actualizacion para obtener nuevos tokens:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}
```

Los tokens de actualizacion son validos por 30 dias y son de un solo uso. Cada actualizacion devuelve un nuevo token de actualizacion.

## Autenticacion con API Key

Para solicitudes servidor a servidor, usa autenticacion con API Key:

```
GET /v1/content/movies
X-API-Key: sk_live_abc123...
```

Genera API Keys en el portal de desarrolladores bajo **Configuracion** > **API Keys**.

## Scopes

| Scope | Nivel de Acceso |
|-------|-----------------|
| `read:content` | Navegar el catalogo de contenido |
| `read:profile` | Acceder a perfiles de usuario |
| `write:profile` | Modificar preferencias de usuario |
| `read:history` | Ver historial de visualizacion |
| `admin` | Acceso administrativo completo |

## Seguridad de Tokens

- Almacena los tokens de forma segura; nunca los expongas en codigo del lado del cliente
- Usa HTTPS para todos los intercambios de tokens
- Implementa rotacion de tokens para sesiones de larga duracion
- Revoca tokens comprometidos inmediatamente a traves del API
