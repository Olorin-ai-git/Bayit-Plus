# Webhooks

Los webhooks de Bayit+ entregan notificaciones en tiempo real cuando ocurren eventos en la plataforma. Usa webhooks para mantener tus sistemas sincronizados sin consultar constantemente el API.

## Configuracion de Webhooks

Configura webhooks en el portal de desarrolladores:

1. Navega a **Configuracion** > **Webhooks**
2. Haz clic en **Agregar Endpoint**
3. Ingresa la URL de tu endpoint (se requiere HTTPS)
4. Selecciona los eventos a los que suscribirte
5. Guarda y anota tu secreto de firma

## Tipos de Eventos

| Evento | Descripcion |
|--------|-------------|
| `user.created` | Nuevo registro de usuario |
| `user.subscription.changed` | Actualizacion de estado de suscripcion |
| `content.published` | Nuevo contenido disponible |
| `content.updated` | Metadatos de contenido cambiados |
| `playback.started` | Sesion de transmision iniciada |
| `playback.completed` | Contenido visto completamente |

## Formato de Carga Util

Todas las cargas utiles de webhook siguen esta estructura:

```json
{
  "id": "evt_abc123",
  "type": "user.subscription.changed",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "user_id": "usr_xyz789",
    "old_plan": "basic",
    "new_plan": "premium",
    "effective_at": "2024-01-15T10:30:00Z"
  }
}
```

## Verificacion de Firma

Verifica la autenticidad del webhook usando el encabezado de firma:

```
X-Bayit-Signature: sha256=abc123...
```

**Proceso de Verificacion**:

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

Siempre verifica las firmas antes de procesar datos de webhook.

## Politica de Reintentos

Las entregas fallidas se reintentan con retroceso exponencial:

| Intento | Demora |
|---------|--------|
| 1 | Inmediato |
| 2 | 1 minuto |
| 3 | 5 minutos |
| 4 | 30 minutos |
| 5 | 2 horas |

Despues de 5 intentos fallidos, el webhook se marca como fallido.

## Responder a Webhooks

Tu endpoint debe devolver un codigo de estado `2xx` dentro de 30 segundos. Devuelve `200 OK` con un cuerpo vacio o JSON de confirmacion.

## Repeticion de Eventos

Repite eventos perdidos desde el portal de desarrolladores:

1. Ve a **Webhooks** > **Registro de Eventos**
2. Filtra por rango de fechas y tipo de evento
3. Selecciona eventos a repetir
4. Haz clic en **Reenviar Seleccionados**

## Prueba de Webhooks

Usa la funcion de prueba para verificar tu endpoint:

1. Selecciona un tipo de evento
2. Haz clic en **Enviar Evento de Prueba**
3. Revisa el estado de entrega y la respuesta

Los eventos de prueba incluyen una bandera `test: true` en la carga util.
