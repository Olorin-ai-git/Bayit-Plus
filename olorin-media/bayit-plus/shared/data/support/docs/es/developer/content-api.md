# API de Contenido

El API de Contenido proporciona acceso al catalogo multimedia de Bayit+ incluyendo peliculas, series, canales y podcasts. Usa estos endpoints para navegar, buscar y obtener detalles del contenido.

## Listar Contenido

Obtiene listados de contenido paginados:

```
GET /v1/content
```

**Parametros de Consulta**:

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `type` | string | Filtrar por tipo de contenido (movie, series, channel, podcast) |
| `category` | string | Filtrar por slug de categoria |
| `rating` | string | Filtrar por clasificacion de edad |
| `q` | string | Consulta de busqueda |
| `page` | integer | Numero de pagina |
| `per_page` | integer | Elementos por pagina (maximo 100) |

**Ejemplo de Solicitud**:

```bash
curl -X GET "https://api.bayit.plus/v1/content?type=movie&category=drama&per_page=20" \
  -H "Authorization: Bearer {access_token}"
```

## Obtener Detalles del Contenido

Obtiene los detalles completos de un elemento de contenido especifico:

```
GET /v1/content/{content_id}
```

**Respuesta**:

```json
{
  "data": {
    "id": "cnt_abc123",
    "type": "movie",
    "title": "Pelicula de Ejemplo",
    "description": "Una historia fascinante sobre...",
    "rating": "PG-13",
    "runtime_minutes": 120,
    "release_year": 2024,
    "categories": ["drama", "thriller"],
    "cast": [
      {"name": "Nombre del Actor", "role": "Personaje"}
    ],
    "images": {
      "poster": "https://cdn.bayit.plus/...",
      "backdrop": "https://cdn.bayit.plus/..."
    }
  }
}
```

## Series y Episodios

Lista los episodios de una serie:

```
GET /v1/content/{series_id}/seasons/{season_number}/episodes
```

Obtiene detalles de un episodio individual:

```
GET /v1/content/{series_id}/episodes/{episode_id}
```

## Canales en Vivo

Obtiene la programacion actual de un canal:

```
GET /v1/content/channels/{channel_id}/schedule
  ?date=2024-01-15
```

## Podcasts

Lista episodios de podcast:

```
GET /v1/content/podcasts/{podcast_id}/episodes
  ?page=1&per_page=50
```

## Categorias de Contenido

Lista todas las categorias disponibles:

```
GET /v1/categories
```

Obtiene contenido dentro de una categoria:

```
GET /v1/categories/{category_slug}/content
```

## Busqueda

Busqueda de texto completo en el catalogo:

```
GET /v1/search?q=termino+de+busqueda&type=movie,series
```

Los resultados de busqueda incluyen puntuacion de relevancia y resaltan coincidencias en titulos y descripciones.
