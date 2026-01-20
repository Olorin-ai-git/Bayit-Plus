# Vista General del REST API

El API de Bayit+ proporciona acceso programatico a la plataforma de streaming. Esta guia cubre las URLs base, versionado, formatos de solicitud y convenciones generales utilizadas en todos los endpoints.

## URLs Base

| Entorno | URL Base |
|---------|----------|
| Produccion | `https://api.bayit.plus/v1` |
| Staging | `https://api.staging.bayit.plus/v1` |
| Sandbox | `https://api.sandbox.bayit.plus/v1` |

Todas las solicitudes del API deben usar HTTPS. Las solicitudes HTTP son rechazadas.

## Versionado del API

La version del API se incluye en la ruta de la URL. La version estable actual es `v1`. Cuando se introducen cambios incompatibles, se lanza una nueva version mientras se mantiene el soporte para versiones anteriores durante un periodo de depreciacion.

Ciclo de vida de versiones:
- **Actual**: Desarrollada activamente y completamente soportada
- **Depreciada**: Soportada pero sin nuevas funciones; se recomienda migracion
- **Retirada**: Ya no esta disponible

## Formato de Solicitud

Todas las solicitudes deben incluir estos encabezados:

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {access_token}
```

Los cuerpos de las solicitudes deben ser JSON valido. Los valores de fecha usan formato ISO 8601.

## Formato de Respuesta

Las respuestas exitosas devuelven JSON con estructura consistente:

```json
{
  "data": { },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Paginacion

Los endpoints de listado soportan paginacion a traves de parametros de consulta:

| Parametro | Descripcion | Predeterminado |
|-----------|-------------|----------------|
| `page` | Numero de pagina (base 1) | 1 |
| `per_page` | Elementos por pagina | 20 |
| `sort` | Campo de ordenamiento | varia |
| `order` | Direccion de orden (asc/desc) | desc |

Las respuestas paginadas incluyen metadatos de navegacion:

```json
{
  "data": [ ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

## Filtrado

La mayoria de los endpoints de listado soportan filtrado mediante parametros de consulta. La sintaxis del filtro varia segun el tipo de campo:

- **Coincidencia exacta**: `?status=published`
- **Valores multiples**: `?category=drama,comedy`
- **Rango**: `?release_year_gte=2020&release_year_lte=2024`
- **Busqueda**: `?q=termino+de+busqueda`

## Disponibilidad de SDK

Los SDK oficiales estan disponibles para:

- JavaScript/TypeScript
- Python
- Swift
- Kotlin

Los SDK manejan la autenticacion, paginacion y manejo de errores automaticamente.
