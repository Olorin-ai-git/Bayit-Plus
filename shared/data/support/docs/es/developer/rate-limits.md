# Limites de Tasa

El API de Bayit+ implementa limites de tasa para asegurar un uso justo y la estabilidad de la plataforma. Esta guia explica las politicas de limite de tasa, encabezados de respuesta y mejores practicas para manejar limites.

## Niveles de Limite de Tasa

Los limites varian segun el metodo de autenticacion y categoria de endpoint:

| Nivel | Solicitudes por Minuto | Solicitudes por Dia |
|-------|------------------------|---------------------|
| Gratuito | 60 | 1,000 |
| Estandar | 300 | 10,000 |
| Premium | 1,000 | 100,000 |
| Empresarial | Personalizado | Personalizado |

Los endpoints de streaming y reproduccion tienen limites separados y mas altos.

## Encabezados de Limite de Tasa

Cada respuesta del API incluye informacion de limite de tasa:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1705312800
```

| Encabezado | Descripcion |
|------------|-------------|
| `X-RateLimit-Limit` | Solicitudes maximas en la ventana actual |
| `X-RateLimit-Remaining` | Solicitudes restantes en la ventana actual |
| `X-RateLimit-Reset` | Marca de tiempo Unix cuando se reinicia la ventana |

## Exceder Limites

Cuando se excede el limite de tasa, el API devuelve `429 Too Many Requests`:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Limite de tasa excedido. Por favor reintente despues de 45 segundos.",
    "retry_after": 45
  }
}
```

El encabezado `Retry-After` indica los segundos hasta que se permita la siguiente solicitud.

## Mejores Practicas

**Implementa Retroceso Exponencial**:

```python
import time

def api_request_with_retry(url, max_retries=5):
    for attempt in range(max_retries):
        response = make_request(url)
        if response.status_code == 429:
            wait_time = 2 ** attempt
            time.sleep(wait_time)
            continue
        return response
    raise Exception("Maximo de reintentos excedido")
```

**Almacena Respuestas en Cache**: Guarda datos accedidos frecuentemente localmente para reducir llamadas al API.

**Usa Endpoints Masivos**: Solicita multiples elementos en una sola llamada cuando este disponible.

**Monitorea el Uso**: Rastrea tu consumo a traves del panel del portal de desarrolladores.

## Limites Especificos por Endpoint

Algunos endpoints tienen restricciones adicionales:

| Endpoint | Limite Especial |
|----------|-----------------|
| `/v1/search` | 30 solicitudes/minuto |
| `/v1/playback/sessions` | 10 sesiones/minuto |
| `/v1/users/*/profiles` | 5 creaciones/hora |

## Manejo de Rafagas

El API permite rafagas breves por encima del limite por minuto. Sin embargo, las solicitudes sostenidas de alto volumen activan la limitacion. Distribuye las solicitudes uniformemente a lo largo del tiempo para un rendimiento optimo.

## Solicitar Limites Mas Altos

Contacta al equipo del API para aumentos de limite:

1. Navega a **Portal de Desarrolladores** > **Soporte**
2. Selecciona **Solicitud de Aumento de Limite de Tasa**
3. Describe tu caso de uso y volumen esperado
4. Envia para revision

Los aumentos se evaluan basandose en la reputacion de la cuenta y la legitimidad del caso de uso.
