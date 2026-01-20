# Gestion de Tickets de Soporte

Gestiona las solicitudes de soporte al cliente de manera eficiente a traves del sistema de tickets de Bayit+. Esta guia cubre los flujos de trabajo de tickets, procedimientos de respuesta y rutas de escalamiento.

## Vista General de la Cola de Tickets

Accede a los tickets de soporte desde **Soporte** > **Tickets**. La cola muestra:

- **Nuevo**: Tickets entrantes sin asignar
- **Abierto**: Asignados y en progreso
- **Pendiente**: Esperando respuesta del cliente
- **Resuelto**: Tickets completados

## Asignacion de Tickets

Los tickets pueden asignarse manual o automaticamente:

**Asignacion Automatica**: Los tickets se enrutan basandose en la categoria y disponibilidad del agente. Configura las reglas en **Configuracion** > **Soporte** > **Enrutamiento**.

**Asignacion Manual**: Los supervisores pueden reasignar tickets desde la vista de cola.

## Trabajar un Ticket

Al gestionar un ticket:

1. Haz clic en el ticket para abrir la vista de detalle
2. Revisa el mensaje del cliente y el historial de la cuenta
3. Accede a los detalles de su cuenta en la barra lateral
4. Redacta tu respuesta en el editor de respuestas
5. Agrega notas internas visibles solo para el personal
6. Actualiza el estado del ticket apropiadamente

## Plantillas de Respuesta

Utiliza plantillas para problemas comunes:

| Plantilla | Caso de Uso |
|-----------|-------------|
| Restablecimiento de Contrasena | Problemas de acceso a la cuenta |
| Consulta de Facturacion | Preguntas sobre pagos |
| Soporte Tecnico | Problemas de reproduccion |
| Solicitud de Contenido | Consultas sobre contenido faltante |

Accede a las plantillas desde la barra de herramientas del editor de respuestas.

## Procedimientos de Escalamiento

Escala tickets que requieren experiencia adicional:

1. Haz clic en **Escalar** en las acciones del ticket
2. Selecciona la razon del escalamiento
3. Elige el equipo o supervisor de destino
4. Agrega contexto para el agente receptor
5. El ticket se mueve a la cola apropiada

## Acuerdos de Nivel de Servicio

Objetivos de tiempo de respuesta por prioridad:

- **Urgente**: Primera respuesta dentro de 1 hora
- **Alta**: Primera respuesta dentro de 4 horas
- **Normal**: Primera respuesta dentro de 24 horas
- **Baja**: Primera respuesta dentro de 48 horas

Los tickets que se acercan a los plazos de SLA se resaltan en la cola.

## Metricas de Tickets

Rastrea el rendimiento del soporte:

- Tiempo promedio de respuesta
- Tiempo de resolucion por categoria
- Puntuaciones de satisfaccion del cliente
- Estadisticas de productividad de agentes

Accede a las metricas desde **Soporte** > **Informes**.

## Cierre de Tickets

Antes de cerrar un ticket:

1. Confirma que el problema esta completamente resuelto
2. Solicita confirmacion del cliente si es apropiado
3. Selecciona la categoria de resolucion
4. Agrega notas de cierre para referencia futura
5. Cambia el estado a **Resuelto**
