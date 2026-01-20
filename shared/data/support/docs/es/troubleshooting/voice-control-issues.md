# Solucion de Problemas de Control por Voz

Tienes problemas con los comandos de voz? Esta guia te ayuda a resolver problemas de permisos de microfono, reconocimiento de voz y deteccion de palabra de activacion.

## Permisos de Microfono

### Verificar Acceso al Microfono

El control por voz requiere permiso de microfono para funcionar.

**iOS:**
1. Abre la Configuracion del dispositivo
2. Desplazate hasta Bayit+
3. Habilita el interruptor de **Microfono**
4. Vuelve a Bayit+ e intenta nuevamente

**Android:**
1. Abre la Configuracion del dispositivo
2. Ve a Apps > Bayit+
3. Toca Permisos
4. Habilita **Microfono**
5. Vuelve a Bayit+ e intenta nuevamente

**Navegador Web:**
1. Haz clic en el icono de candado en la barra de direcciones
2. Encuentra el permiso de Microfono
3. Configura en **Permitir**
4. Actualiza la pagina

### Error de Permiso Denegado

Si ves "Acceso al microfono denegado":
1. Sigue los pasos anteriores para tu dispositivo
2. Reinicia la app de Bayit+
3. Intenta el control por voz nuevamente
4. Otorga permiso cuando se te solicite

### Microfono En Uso por Otra App

Si otra app esta usando el microfono:
1. Cierra otras apps con voz habilitada
2. Finaliza cualquier llamada activa
3. Detiene cualquier grabacion en progreso
4. Vuelve a Bayit+ e intenta nuevamente

## Problemas de Reconocimiento de Voz

### Voz No Reconocida

Si la app no entiende tus comandos:

1. **Habla claramente** - Usa un ritmo de habla normal
2. **Reduce el ruido de fondo** - Muevete a un area mas silenciosa
3. **Acercate** - Habla hacia el microfono
4. **Verifica el microfono** - Asegurate de que no este bloqueado

### Mejorar la Precision del Reconocimiento

1. Ve a **Configuracion** > **Control por Voz** > **Idioma**
2. Selecciona tu idioma preferido
3. Habilita **Entrenamiento de Voz** si esta disponible
4. Completa la sesion de entrenamiento

### Idiomas Soportados

El control por voz soporta:
- Ingles (EE.UU., Reino Unido, Australiano)
- Hebreo
- Espanol (Latinoamerica, Europeo)

Selecciona tu idioma en Configuracion > Control por Voz.

### Comandos de Voz Comunes

| Comando | Accion |
|---------|--------|
| "Reproducir [titulo]" | Comienza a reproducir contenido |
| "Pausar" | Pausa la reproduccion actual |
| "Reanudar" | Reanuda la reproduccion |
| "Retroceder 30 segundos" | Rebobina la reproduccion |
| "Avanzar" | Salta hacia adelante |
| "Activar subtitulos" | Habilita los subtitulos |
| "Buscar [consulta]" | Busca contenido |
| "Abrir configuracion" | Va a configuracion |

## Problemas con Palabra de Activacion

### Palabra de Activacion No Detectada

La palabra de activacion "Hey Bayit" activa el control por voz.

Si la palabra de activacion no se detecta:
1. Ve a **Configuracion** > **Control por Voz**
2. Verifica que **Deteccion de Palabra de Activacion** este habilitada
3. Confirma que el permiso de microfono este otorgado
4. Asegurate de que el dispositivo no este en modo de ahorro de energia

### Ajustar Sensibilidad de Palabra de Activacion

1. Ve a **Configuracion** > **Control por Voz** > **Palabra de Activacion**
2. Ajusta el nivel de **Sensibilidad**:
   - **Baja** - Menos activaciones falsas
   - **Media** - Balanceada (recomendada)
   - **Alta** - Mas receptiva

### Activaciones Falsas

Si el control por voz se activa involuntariamente:
1. Reduce la sensibilidad de la palabra de activacion
2. Deshabilita la palabra de activacion y usa activacion por boton
3. Verifica si hay palabras similares cerca

### Cambiar Metodo de Activacion

Si prefieres no usar la palabra de activacion:
1. Ve a **Configuracion** > **Control por Voz**
2. Deshabilita **Deteccion de Palabra de Activacion**
3. Usa el boton del microfono en su lugar
4. Manteno presionado para hablar comandos

## Problemas Especificos por Dispositivo

### Control por Voz en Smart TV

**Apple TV:**
1. Manten presionado el boton de Siri en el control remoto
2. Habla tu comando
3. La palabra de activacion no esta soportada en Apple TV

**Android TV:**
1. Presiona el boton del microfono en el control remoto
2. O di "Hey Google, abre Bayit+"
3. Usa la integracion con Google Assistant

**Amazon Fire TV:**
1. Manten presionado el boton de Alexa en el control remoto
2. Di "Alexa, abre Bayit+"
3. Usa Alexa para comandos de voz

### Control por Voz en Moviles

1. Toca el icono del microfono en la app
2. O usa la palabra de activacion cuando la app este abierta
3. La escucha en segundo plano requiere que la app este activa

## Pasos de Solucion de Problemas

### Control por Voz No Funciona

1. Reinicia la app de Bayit+
2. Verifica los permisos del microfono
3. Verifica la conexion a internet
4. Actualiza la app a la ultima version
5. Reinicia tu dispositivo

### Control por Voz Funcionaba Antes

1. Verifica cambios recientes de permisos
2. Confirma que no haya nuevas apps bloqueando el microfono
3. Verifica actualizaciones del sistema
4. Limpia el cache de la app e intenta nuevamente

### Probar Tu Microfono

1. Ve a **Configuracion** > **Control por Voz**
2. Toca **Probar Microfono**
3. Habla cuando se te indique
4. Verifica que tu voz sea detectada
5. Ajusta la sensibilidad del microfono si es necesario

## Privacidad y Datos de Voz

### Politica de Grabacion de Voz

- Los datos de voz se procesan en tiempo real
- Los comandos no se almacenan permanentemente
- No se comparten datos de voz con terceros
- Deshabilita el historial de voz en configuracion de privacidad

### Deshabilitar Funciones de Voz

1. Ve a **Configuracion** > **Control por Voz**
2. Desactiva **Control por Voz**
3. Las funciones de voz se deshabilitan completamente
4. Usa solo controles manuales

## Contactar Soporte

Para problemas persistentes de control por voz:
1. **En la App**: Configuracion > Ayuda > Problema de Control por Voz
2. Incluye: tipo de dispositivo, comando intentado y mensaje de error
