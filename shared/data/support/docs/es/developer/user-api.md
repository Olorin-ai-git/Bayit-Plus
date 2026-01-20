# API de Usuarios

El API de Usuarios proporciona acceso a cuentas de usuario, perfiles, preferencias y listas de reproduccion. Estos endpoints requieren scopes OAuth apropiados para el acceso a datos de usuario.

## Obtener Usuario Actual

Obtiene la informacion de cuenta del usuario autenticado:

```
GET /v1/users/me
Authorization: Bearer {access_token}
```

**Respuesta**:

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "usuario@ejemplo.com",
    "created_at": "2024-01-01T00:00:00Z",
    "subscription": {
      "plan": "premium",
      "status": "active",
      "expires_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

## Perfiles de Usuario

Lista los perfiles bajo la cuenta:

```
GET /v1/users/me/profiles
```

Crea un nuevo perfil:

```
POST /v1/users/me/profiles
Content-Type: application/json

{
  "name": "Nombre del Perfil",
  "avatar_id": "avatar_01",
  "is_kids_profile": false,
  "age_range": "adult"
}
```

Actualiza la configuracion del perfil:

```
PATCH /v1/users/me/profiles/{profile_id}
```

## Preferencias del Perfil

Obtiene las preferencias del perfil:

```
GET /v1/profiles/{profile_id}/preferences
```

Actualiza las preferencias:

```
PATCH /v1/profiles/{profile_id}/preferences
Content-Type: application/json

{
  "language": "es",
  "subtitle_language": "es",
  "autoplay_enabled": true,
  "maturity_level": "pg13"
}
```

## Lista de Reproduccion

Obtiene la lista de reproduccion del perfil:

```
GET /v1/profiles/{profile_id}/watchlist
```

Agrega contenido a la lista de reproduccion:

```
POST /v1/profiles/{profile_id}/watchlist
Content-Type: application/json

{
  "content_id": "cnt_abc123"
}
```

Elimina de la lista de reproduccion:

```
DELETE /v1/profiles/{profile_id}/watchlist/{content_id}
```

## Historial de Visualizacion

Obtiene el historial de visualizacion:

```
GET /v1/profiles/{profile_id}/history
  ?page=1&per_page=50
```

Registra el progreso de reproduccion:

```
POST /v1/profiles/{profile_id}/history
Content-Type: application/json

{
  "content_id": "cnt_abc123",
  "position_seconds": 1234,
  "completed": false
}
```

## Continuar Viendo

Obtiene contenido en progreso para el perfil:

```
GET /v1/profiles/{profile_id}/continue-watching
```

Devuelve contenido con progreso guardado, ordenado por hora de ultima visualizacion.
