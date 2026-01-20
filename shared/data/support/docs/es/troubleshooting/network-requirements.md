# Requisitos de Red

Asegura que tu conexion a internet cumpla con los requisitos para un rendimiento optimo de streaming en Bayit+.

## Requisitos de Velocidad de Internet

### Velocidades Minimas por Calidad

| Calidad de Video | Velocidad de Descarga Requerida |
|------------------|--------------------------------|
| SD (480p) | 3 Mbps |
| HD (720p) | 5 Mbps |
| Full HD (1080p) | 10 Mbps |
| 4K Ultra HD | 25 Mbps |
| 4K con HDR | 40 Mbps |

### Probar Tu Velocidad

1. Visita speedtest.net o fast.com
2. Ejecuta una prueba de velocidad
3. Anota tu velocidad de descarga
4. Compara con los requisitos
5. Prueba en diferentes momentos del dia

### Recomendaciones de Velocidad

Para la mejor experiencia, recomendamos:
- **Un espectador:** 1.5x la velocidad minima
- **Multiples espectadores:** Suma los requisitos
- **Ejemplo:** Dos transmisiones 4K necesitan 50+ Mbps

## Optimizacion de Wi-Fi

### Ubicacion del Router

1. Coloca el router en una ubicacion central
2. Eleva el router del piso
3. Mantente alejado de paredes y objetos metalicos
4. Evita ubicarlo cerca de microondas o telefonos inalambricos

### Bandas de Frecuencia Wi-Fi

| Banda | Mejor Para |
|-------|-----------|
| 2.4 GHz | Mayor alcance, mas interferencia |
| 5 GHz | Velocidades mas rapidas, menor alcance |

**Recomendacion:** Usa 5 GHz para streaming cuando sea posible.

### Reducir Interferencia

1. Cambia el canal Wi-Fi en la configuracion del router
2. Actualiza el firmware del router
3. Elimina dispositivos conectados no utilizados
4. Considera Wi-Fi mesh para casas grandes

### Conexion por Cable

Para streaming mas estable en TV:
1. Conecta cable Ethernet al dispositivo de streaming
2. Conecta el otro extremo al router
3. Las conexiones por cable eliminan problemas de Wi-Fi
4. Recomendado para streaming 4K

## Configuracion de Firewall

### Puertos Requeridos

Bayit+ requiere que estos puertos esten abiertos:

| Puerto | Protocolo | Proposito |
|--------|-----------|-----------|
| 80 | TCP | Trafico HTTP |
| 443 | TCP | Trafico HTTPS |
| 53 | UDP | Resolucion DNS |

### Configurar Tu Firewall

1. Accede al panel de administracion del router
2. Encuentra la configuracion de firewall o seguridad
3. Asegura que los puertos anteriores no esten bloqueados
4. Agrega Bayit+ a las aplicaciones permitidas

### Redes Empresariales

Para redes corporativas o escolares:
1. Contacta a tu administrador de TI
2. Solicita acceso a servicios de streaming
3. Proporciona el dominio requerido: *.bayitplus.com
4. Puede necesitar configuracion de proxy

## Problemas de VPN

### Compatibilidad con VPN

Usar una VPN puede causar problemas:
- Velocidad de streaming reducida
- Conflictos de restriccion geografica
- Caidas de conexion durante reproduccion
- Algunas VPNs estan bloqueadas

### Configuracion VPN Recomendada

Si debes usar una VPN:
1. Conecta a un servidor en tu pais de origen
2. Usa un servidor optimizado para streaming
3. Habilita tunel dividido para Bayit+
4. Usa protocolo UDP para mejor velocidad

### Deshabilitar VPN para Streaming

Para mejor experiencia:
1. Deshabilita VPN cuando veas Bayit+
2. O excluye Bayit+ del tunel VPN
3. Consulta a tu proveedor de VPN para tunel dividido

### Error de VPN Bloqueada

Si ves un error relacionado con VPN:
1. Desconecta de la VPN
2. Limpia el cache de la app
3. Reinicia la app
4. Intenta nuevamente sin VPN

## Streaming con Datos Moviles

### Estimaciones de Uso de Datos

| Calidad | Datos por Hora |
|---------|----------------|
| Baja | 0.3 GB |
| Media | 0.7 GB |
| Alta | 1.5 GB |
| Ultra | 3 GB |

### Reducir Uso de Datos Moviles

1. Ve a **Configuracion** > **Reproduccion**
2. Configura **Calidad de Datos Moviles** a Baja o Media
3. Habilita **Solo Wi-Fi** para descargas
4. Usa contenido descargado cuando sea posible

### Requisitos de Red Celular

- 4G LTE recomendado para streaming HD
- 5G proporciona la mejor experiencia movil
- 3G puede solo soportar calidad SD
- La intensidad de la senal afecta el rendimiento

## Solucion de Problemas de Red

### Conexion se Cae Durante Reproduccion

1. Verifica si hay zonas muertas de Wi-Fi
2. Acercate al router
3. Reinicia router y dispositivo
4. Reduce la configuracion de calidad de video
5. Prueba conexion por cable

### Problemas de Buffering

1. Ejecuta una prueba de velocidad
2. Cierra otras apps de streaming
3. Desconecta dispositivos no utilizados
4. Reduce la calidad en Configuracion > Reproduccion
5. Reinicia el equipo de red

### Diagnostico de Red

1. Ve a **Configuracion** > **Ayuda** > **Prueba de Red**
2. Ejecuta el diagnostico incorporado
3. Revisa resultados y recomendaciones
4. Sigue las correcciones sugeridas

### Problemas de DNS

Si el contenido no carga:
1. Intenta cambiar los servidores DNS
2. Ve a la configuracion del router
3. Configura DNS a Google (8.8.8.8) o Cloudflare (1.1.1.1)
4. Reinicia los dispositivos despues del cambio

## Consideraciones del ISP

### Estrangulamiento

Algunos ISPs estrangulan el trafico de streaming:
1. Ejecuta prueba de velocidad a servidores de Bayit+
2. Compara con prueba de velocidad general
3. Contacta al ISP si son significativamente diferentes
4. Considera un ISP que no estrangule

### Limites de Datos

Ten en cuenta los limites de datos:
1. Verifica el limite de datos de tu ISP
2. Monitorea el uso mensual
3. Reduce la calidad para conservar datos
4. Considera planes ilimitados para streaming intensivo

## Contactar Soporte

Para ayuda relacionada con la red:
1. **En la App**: Configuracion > Ayuda > Problema de Red
2. Ejecuta el diagnostico de red antes de contactar
3. Incluye: nombre del ISP, resultados de prueba de velocidad, modelo del router
