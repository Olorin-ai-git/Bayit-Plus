# Manejo de Errores

El API de Bayit+ utiliza codigos de estado HTTP estandar y formatos de respuesta de error consistentes. Esta guia cubre las estructuras de error, codigos de error comunes y estrategias de reintento.

## Formato de Respuesta de Error

Todos los errores devuelven un objeto JSON con esta estructura:

```json
{
  "error": {
    "code": "validation_error",
    "message": "La solicitud contiene parametros invalidos.",
    "details": [
      {
        "field": "email",
        "message": "Formato de correo electronico invalido"
      }
    ],
    "request_id": "req_abc123"
  }
}
```

| Campo | Descripcion |
|-------|-------------|
| `code` | Codigo de error legible por maquina |
| `message` | Descripcion legible por humanos |
| `details` | Arreglo de errores a nivel de campo (cuando aplica) |
| `request_id` | Identificador unico para consultas de soporte |

## Codigos de Estado HTTP

| Estado | Significado |
|--------|-------------|
| 400 | Solicitud Incorrecta - Parametros invalidos |
| 401 | No Autorizado - Autenticacion invalida o faltante |
| 403 | Prohibido - Permisos insuficientes |
| 404 | No Encontrado - El recurso no existe |
| 409 | Conflicto - Conflicto de estado del recurso |
| 422 | Entidad No Procesable - Validacion fallida |
| 429 | Demasiadas Solicitudes - Limite de tasa excedido |
| 500 | Error Interno del Servidor - Problema del lado del servidor |
| 503 | Servicio No Disponible - Mantenimiento temporal |

## Codigos de Error Comunes

| Codigo | Descripcion | Resolucion |
|--------|-------------|------------|
| `invalid_token` | Token de acceso invalido o expirado | Renueva el token |
| `insufficient_scope` | El token carece de permisos requeridos | Solicita scopes adicionales |
| `resource_not_found` | El elemento solicitado no existe | Verifica el ID del recurso |
| `validation_error` | Los parametros de solicitud son invalidos | Revisa el arreglo de detalles |
| `rate_limit_exceeded` | Demasiadas solicitudes | Espera y reintenta |
| `concurrent_limit` | Demasiadas transmisiones activas | Cierra otras sesiones |

## Estrategia de Reintento

Implementa logica de reintento inteligente para errores transitorios:

```python
RETRYABLE_CODES = [429, 500, 502, 503, 504]

def should_retry(status_code, attempt, max_attempts=3):
    if attempt >= max_attempts:
        return False
    return status_code in RETRYABLE_CODES

def calculate_delay(attempt, base_delay=1):
    return base_delay * (2 ** attempt)
```

## Idempotencia

Para operaciones de escritura, incluye una clave de idempotencia para reintentar de forma segura:

```
POST /v1/profiles
Idempotency-Key: unique-request-id-123
```

Las solicitudes repetidas con la misma clave devuelven la respuesta original sin crear duplicados.

## Registro de Errores

Registra errores con el ID de solicitud para solucion de problemas:

```python
if response.status_code >= 400:
    error = response.json().get("error", {})
    logger.error(
        f"Error de API: {error.get('code')} - {error.get('message')} "
        f"(request_id: {error.get('request_id')})"
    )
```

## Escalamiento a Soporte

Para errores persistentes, contacta a soporte con:

- El `request_id` de la respuesta de error
- Marca de tiempo de la solicitud
- Detalles completos de la solicitud (sanitiza datos sensibles)
- Comportamiento esperado versus comportamiento real
