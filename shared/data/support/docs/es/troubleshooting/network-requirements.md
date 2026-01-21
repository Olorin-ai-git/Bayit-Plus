# Requisitos de Red

Asegurate de que tu conexion a internet cumpla los requisitos para un rendimiento optimo de streaming en Bayit+.

## Requisitos de Velocidad de Internet

### Velocidades Minimas por Calidad

| Calidad de Video | Velocidad de Descarga Requerida |
|------------------|--------------------------------|
| SD (480p) | 3 Mbps |
| HD (720p) | 5 Mbps |
| Full HD (1080p) | 10 Mbps |
| 4K Ultra HD | 25 Mbps |
| 4K con HDR | 40 Mbps |

### Probar tu Velocidad

1. Visita speedtest.net o fast.com
2. Ejecuta una prueba de velocidad
3. Anota tu velocidad de descarga
4. Compara con los requisitos
5. Prueba en diferentes momentos del dia

### Recomendaciones de Velocidad

Para la mejor experiencia, recomendamos:
- **Un espectador:** 1.5x la velocidad minima
- **Multiples espectadores:** Suma los requisitos juntos
- **Ejemplo:** Dos transmisiones 4K necesitan 50+ Mbps

## Optimizacion de Wi-Fi

### Ubicacion del Router

1. Coloca el router en una ubicacion central
2. Eleva el router del piso
3. Mantente alejado de paredes y objetos metalicos
4. Evita colocarlo cerca de microondas o telefonos inalambricos

### Bandas de Frecuencia Wi-Fi

| Banda | Mejor Para |
|-------|------------|
| 2.4 GHz | Mayor alcance, mas interferencia |
| 5 GHz | Velocidades mas rapidas, menor alcance |

**Recomendacion:** Usa 5 GHz para streaming cuando sea posible.

### Reducir Interferencia

1. Cambia el canal de Wi-Fi en la configuracion del router
2. Actualiza el firmware del router
3. Elimina dispositivos conectados no utilizados
4. Considera Wi-Fi mesh para casas grandes

### Conexion por Cable

Para streaming mas estable en TV:
1. Conecta el cable Ethernet al dispositivo de streaming
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

### Configurar tu Firewall

1. Accede al panel de administracion del router
2. Encuentra la configuracion de firewall o seguridad
3. Asegurate de que los puertos anteriores no esten bloqueados
4. Agrega Bayit+ a las aplicaciones permitidas

### Redes Empresariales

Para redes corporativas o escolares:
1. Contacta a tu administrador de TI
2. Solicita acceso a servicios de streaming
3. Proporciona el dominio requerido: *.bayitplus.com
4. Puede necesitar configuracion de proxy

## Problemas con VPN

### Compatibilidad con VPN

Usar una VPN puede causar problemas:
- Velocidad de streaming reducida
- Conflictos de restriccion geografica
- Desconexiones durante la reproduccion
- Algunas VPNs estan bloqueadas

### Configuracion Recomendada de VPN

Si debes usar una VPN:
1. Conectate a un servidor en tu pais de origen
2. Usa un servidor optimizado para streaming
3. Habilita split tunneling para Bayit+
4. Usa el protocolo UDP para mejor velocidad

### Deshabilitar VPN para Streaming

Para la mejor experiencia:
1. Deshabilita la VPN cuando veas Bayit+
2. O excluye Bayit+ del tunel VPN
3. Revisa con tu proveedor de VPN el split tunneling

### Error de VPN Bloqueada

Si ves un error relacionado con VPN:
1. Desconectate de la VPN
2. Limpia la cache de la app
3. Reinicia la app
4. Intenta de nuevo sin VPN

## Streaming con Datos Moviles

### Estimaciones de Uso de Datos

| Calidad | Datos por Hora |
|---------|----------------|
| Baja | 0.3 GB |
| Media | 0.7 GB |
| Alta | 1.5 GB |
| Ultra | 3 GB |

### Reducir el Uso de Datos Moviles

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

### Desconexiones Durante la Reproduccion

1. Verifica si hay puntos muertos de Wi-Fi
2. Acercate al router
3. Reinicia el router y el dispositivo
4. Baja la configuracion de calidad de video
5. Prueba una conexion por cable

### Problemas de Buffering

1. Ejecuta una prueba de velocidad
2. Cierra otras apps de streaming
3. Desconecta dispositivos no utilizados
4. Baja la calidad en Configuracion > Reproduccion
5. Reinicia el equipo de red

### Diagnostico de Red

1. Ve a **Configuracion** > **Ayuda** > **Prueba de Red**
2. Ejecuta el diagnostico integrado
3. Revisa los resultados y recomendaciones
4. Sigue las correcciones sugeridas

### Problemas de DNS

Si el contenido no carga:
1. Intenta cambiar los servidores DNS
2. Ve a la configuracion del router
3. Configura DNS a Google (8.8.8.8) o Cloudflare (1.1.1.1)
4. Reinicia los dispositivos despues del cambio

## Consideraciones del ISP

### Estrangulamiento

Algunos ISPs estangulan el trafico de streaming:
1. Ejecuta una prueba de velocidad a los servidores de Bayit+
2. Compara con una prueba de velocidad general
3. Contacta al ISP si hay diferencia significativa
4. Considera un ISP que no estrangule

### Limites de Datos

Ten en cuenta los limites de datos:
1. Verifica el limite de datos de tu ISP
2. Monitorea el uso mensual
3. Baja la calidad para conservar datos
4. Considera planes ilimitados para streaming intensivo

## Contactar Soporte

Para ayuda relacionada con la red:
1. **En la App:** Configuracion > Ayuda > Problema de Red
2. Ejecuta el diagnostico de red antes de contactar
3. Incluye: nombre del ISP, resultados de prueba de velocidad, modelo del router
