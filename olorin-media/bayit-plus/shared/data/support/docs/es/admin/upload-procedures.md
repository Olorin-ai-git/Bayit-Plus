# Procedimientos de Carga de Video

Esta guia cubre el flujo de trabajo completo para cargar contenido de video a Bayit+, desde la preparacion de archivos hasta la codificacion y completacion de metadatos.

## Preparacion de Archivos

Antes de cargar, asegurate de que tus archivos fuente cumplan con estos requisitos:

| Especificacion | Requisito |
|----------------|-----------|
| Formato | MP4, MOV, MKV o MXF |
| Codec de Video | H.264, H.265 o ProRes |
| Resolucion | Minimo 1920x1080 (4K preferido) |
| Audio | AAC o PCM, estereo o 5.1 |
| Tasa de Bits | Minimo 15 Mbps para HD |

## Iniciar una Carga

1. Navega a **Contenido** > **Cargar**
2. Arrastra archivos a la zona de carga o haz clic para explorar
3. Se pueden cargar multiples archivos simultaneamente
4. Los archivos grandes soportan cargas reanudables

## Progreso de Carga

Monitorea el estado de carga desde la **Cola de Cargas**:

- **Cargando**: Transferencia de archivo en progreso
- **Procesando**: Transcodificacion y empaquetado
- **Listo**: Disponible para ingreso de metadatos
- **Publicado**: En vivo en la plataforma

## Proceso de Codificacion

Despues de la carga, los archivos se transcodifican automaticamente:

- Multiples niveles de calidad (SD, HD, 4K cuando aplique)
- Empaquetado HLS para streaming adaptativo
- Normalizacion de audio y cumplimiento de sonoridad
- Generacion de miniaturas en cuadros clave

El tiempo de procesamiento varia segun la duracion y calidad de la fuente.

## Ingreso de Metadatos

Completa los metadatos requeridos para cada carga:

1. **Informacion Basica**: Titulo, descripcion, ano de lanzamiento
2. **Clasificacion**: Categorias, generos, etiquetas
3. **Clasificaciones**: Clasificacion de edad y descriptores de contenido
4. **Creditos**: Detalles de elenco, equipo y produccion
5. **Imagenes**: Poster, fondo e imagenes de logo

## Requisitos de Imagenes

| Tipo de Recurso | Dimensiones | Formato |
|-----------------|-------------|---------|
| Poster | 800x1200 px | JPEG o PNG |
| Fondo | 1920x1080 px | JPEG o PNG |
| Logo | 400x150 px | PNG con transparencia |
| Miniatura | 640x360 px | JPEG |

## Publicacion de Contenido

Una vez que los metadatos estan completos:

1. Haz clic en **Revisar** para previsualizar la pagina de contenido
2. Verifica que toda la informacion se muestre correctamente
3. Elige el momento de publicacion (inmediato o programado)
4. Haz clic en **Publicar** para hacer el contenido disponible

## Cargas Masivas

Para grandes bibliotecas de contenido, utiliza la funcion de carga masiva:

1. Prepara un archivo CSV con los metadatos
2. Carga los archivos de video via SFTP
3. Importa el CSV de metadatos
4. Revisa y publica en lotes
