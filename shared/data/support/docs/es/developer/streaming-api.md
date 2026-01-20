# API de Streaming

El API de Streaming proporciona endpoints para iniciar sesiones de reproduccion, obtener URLs de transmision y gestionar la calidad del streaming adaptativo. Todas las transmisiones usan HLS (HTTP Live Streaming) con proteccion DRM opcional.

## Iniciar una Sesion de Reproduccion

Inicializa una sesion de streaming:

```
POST /v1/playback/sessions
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "content_id": "cnt_abc123",
  "profile_id": "prf_xyz789",
  "device_type": "web",
  "drm_type": "widevine"
}
```

**Respuesta**:

```json
{
  "data": {
    "session_id": "ses_abc123",
    "manifest_url": "https://stream.bayit.plus/.../manifest.m3u8",
    "license_url": "https://drm.bayit.plus/license",
    "expires_at": "2024-01-15T12:00:00Z",
    "resume_position": 1234
  }
}
```

## Manifiesto de Transmision

La URL del manifiesto devuelve una lista de reproduccion HLS con multiples niveles de calidad:

| Calidad | Resolucion | Tasa de Bits |
|---------|------------|--------------|
| Auto | Adaptativo | Variable |
| SD | 720x480 | 1.5 Mbps |
| HD | 1280x720 | 3 Mbps |
| FHD | 1920x1080 | 6 Mbps |
| 4K | 3840x2160 | 15 Mbps |

## Configuracion de DRM

Bayit+ soporta multiples sistemas DRM:

| Sistema DRM | Plataformas |
|-------------|-------------|
| Widevine | Android, Chrome, Firefox |
| FairPlay | iOS, Safari, tvOS |
| PlayReady | Windows, Xbox, Edge |

Solicita el tipo de DRM apropiado basandote en el dispositivo de reproduccion.

## Seleccion de Calidad

Fuerza un nivel de calidad especifico:

```
POST /v1/playback/sessions/{session_id}/quality
Content-Type: application/json

{
  "quality": "fhd"
}
```

## Latido de Sesion

Mantiene una sesion activa con latidos periodicos:

```
POST /v1/playback/sessions/{session_id}/heartbeat
Content-Type: application/json

{
  "position_seconds": 2345,
  "buffer_health": 15.5,
  "quality": "hd"
}
```

Envia latidos cada 30 segundos durante la reproduccion.

## Finalizar una Sesion

Cierra correctamente una sesion de reproduccion:

```
DELETE /v1/playback/sessions/{session_id}
Content-Type: application/json

{
  "final_position": 3456,
  "completed": false
}
```

Esto registra la posicion final para la funcionalidad de reanudacion.

## Limites de Transmision Concurrente

Las cuentas tienen limites de transmision concurrente basados en el nivel de suscripcion. Exceder el limite devuelve un estado `429` con las sesiones disponibles en la respuesta para posible terminacion.

## Pistas de Audio y Subtitulos

Las pistas disponibles se listan en el manifiesto. Selecciona pistas del lado del cliente usando la seleccion de pistas HLS estandar.
