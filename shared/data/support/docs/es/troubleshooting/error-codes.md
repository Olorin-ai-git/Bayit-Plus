# Referencia de Codigos de Error

Esta guia explica los codigos de error comunes de Bayit+ y sus soluciones.

## Errores de Red (E001-E019)

### E001 - Error de Conexion de Red

**Causa:** No se puede conectar a los servidores de Bayit+.

**Soluciones:**
1. Verifica tu conexion a internet
2. Reinicia tu router o modem
3. Intenta cambiar entre Wi-Fi y datos moviles
4. Desactiva VPN si esta activo
5. Intenta nuevamente en unos minutos

### E002 - Tiempo de Conexion Agotado

**Causa:** La respuesta del servidor tomo demasiado tiempo.

**Soluciones:**
1. Verifica la velocidad de internet (minimo 3 Mbps requerido)
2. Acercate a tu router Wi-Fi
3. Cierra otras aplicaciones que consuman mucho ancho de banda
4. Reinicia la app de Bayit+
5. Prueba una conexion por cable si es posible

### E003 - Resolucion DNS Fallida

**Causa:** No se puede resolver la direccion del servidor.

**Soluciones:**
1. Reinicia tu dispositivo
2. Restablece la configuracion de red
3. Intenta usar Google DNS (8.8.8.8) o Cloudflare (1.1.1.1)
4. Contacta a tu proveedor de internet si persiste

## Errores de Autenticacion (E020-E039)

### E020 - Autenticacion Fallida

**Causa:** Las credenciales de inicio de sesion son incorrectas o expiraron.

**Soluciones:**
1. Verifica correo electronico y contrasena
2. Usa "Olvide mi Contrasena" para restablecer
3. Verifica que Bloq Mayus no este activado
4. Intenta iniciar sesion en la web

### E021 - Sesion Expirada

**Causa:** Tu sesion de inicio de sesion ha caducado.

**Soluciones:**
1. Inicia sesion nuevamente con tus credenciales
2. Habilita "Recordarme" para sesiones mas largas
3. Verifica la configuracion de fecha y hora del dispositivo

### E022 - Cuenta Bloqueada

**Causa:** Demasiados intentos fallidos de inicio de sesion.

**Soluciones:**
1. Espera 30 minutos antes de intentar nuevamente
2. Usa "Olvide mi Contrasena" para restablecer
3. Contacta soporte si no intentaste estos inicios de sesion

### E023 - Dos Factores Requerido

**Causa:** Se necesita codigo 2FA pero no se proporciono.

**Soluciones:**
1. Ingresa el codigo de tu app de autenticacion
2. Verifica tu SMS para el codigo
3. Usa un codigo de respaldo si es necesario
4. Contacta soporte si estas bloqueado

## Errores de Suscripcion (E040-E059)

### E040 - Suscripcion Requerida

**Causa:** No se encontro suscripcion activa.

**Soluciones:**
1. Verifica el estado de la suscripcion en Configuracion de Cuenta
2. Confirma que el metodo de pago sea valido
3. Reactiva la suscripcion si expiro
4. Cierra sesion e inicia sesion nuevamente para actualizar

### E041 - Pago Fallido

**Causa:** El pago de suscripcion no pudo procesarse.

**Soluciones:**
1. Actualiza el metodo de pago
2. Verifica que la tarjeta tenga fondos suficientes
3. Contacta a tu banco si la tarjeta es rechazada
4. Prueba un metodo de pago alternativo

### E042 - Limite del Plan Alcanzado

**Causa:** Limite de transmisiones simultaneas excedido.

**Soluciones:**
1. Detiene la reproduccion en otro dispositivo
2. Verifica Configuracion > Dispositivos para transmisiones activas
3. Actualiza el plan para mas transmisiones simultaneas

## Errores de Contenido (E060-E079)

### E060 - Contenido No Disponible

**Causa:** El contenido solicitado no puede reproducirse.

**Soluciones:**
1. El contenido puede haber sido eliminado
2. La licencia puede haber cambiado
3. Verifica si el contenido esta disponible en tu region
4. Prueba un titulo diferente

### E061 - Restriccion Geografica

**Causa:** El contenido no esta disponible en tu ubicacion.

**Soluciones:**
1. Algunos contenidos estan bloqueados por region
2. Verifica la disponibilidad del contenido para tu region
3. Desactiva VPN si estas usando uno
4. Contacta soporte para preguntas de disponibilidad

### E062 - Error de Reproduccion

**Causa:** El video no puede reproducirse.

**Soluciones:**
1. Reinicia la app
2. Limpia el cache de la app
3. Actualiza a la ultima version de la app
4. Prueba una configuracion de calidad diferente
5. Reinicia tu dispositivo

### E063 - Descarga No Permitida

**Causa:** El contenido no puede descargarse.

**Soluciones:**
1. Verifica que tu plan soporte descargas
2. Confirma si el contenido especifico permite descargas
3. Algunos contenidos tienen restricciones de descarga

## Errores de Dispositivo (E080-E099)

### E080 - Limite de Dispositivos Excedido

**Causa:** Maximo de dispositivos registrados alcanzado.

**Soluciones:**
1. Ve a Configuracion > Dispositivos
2. Elimina dispositivos que ya no uses
3. Actualiza el plan para mas espacios de dispositivos

### E081 - Dispositivo No Soportado

**Causa:** Tu dispositivo no cumple los requisitos.

**Soluciones:**
1. Actualiza el sistema operativo del dispositivo
2. Verifica los requisitos minimos
3. Intenta usar un dispositivo soportado
4. Actualiza la app de Bayit+

### E082 - Error HDCP

**Causa:** El handshake HDCP fallo con la pantalla.

**Soluciones:**
1. Verifica la conexion del cable HDMI
2. Prueba un puerto HDMI diferente
3. Usa un cable HDMI certificado
4. Reinicia tanto el dispositivo como el TV
5. Desactiva cualquier divisor HDMI

### E083 - Error DRM

**Causa:** La verificacion de gestion de derechos digitales fallo.

**Soluciones:**
1. Actualiza el software del dispositivo
2. Actualiza la app de Bayit+
3. Limpia el cache de la app
4. Reinicia el dispositivo
5. Reinstala la app si persiste

## Errores de Servidor (E090-E099)

### E090 - Error de Servidor

**Causa:** Problema con los servidores de Bayit+.

**Soluciones:**
1. Verifica la pagina de estado del servicio
2. Espera unos minutos y reintenta
3. Los problemas de servidor generalmente se resuelven rapidamente

### E091 - Modo de Mantenimiento

**Causa:** Bayit+ esta en mantenimiento programado.

**Soluciones:**
1. Espera a que el mantenimiento termine
2. Verifica la pagina de estado para la hora estimada de finalizacion
3. Sigue las redes sociales para actualizaciones

### E099 - Error Desconocido

**Causa:** Ocurrio un error inesperado.

**Soluciones:**
1. Reinicia la app
2. Actualiza a la ultima version
3. Reinicia el dispositivo
4. Contacta soporte con los detalles del error

## Reportar Errores No Resueltos

Si tu error persiste:
1. Anota el codigo de error exacto
2. Toma una captura de pantalla si es posible
3. Ve a **Configuracion** > **Ayuda** > **Reportar Problema**
4. Incluye: codigo de error, pasos tomados, informacion del dispositivo
5. El soporte tipicamente responde dentro de 24 horas
