# Configuracion operativa de Terranova

- La configuracion de referencia esta en waha-config.json. Mantener .env y los webhooks de WAHA alineados con ella.
- Este proyecto usa la sesion negocio_local, PORT=3030 y WAHA en http://localhost:3031.
- Webhook de mensajes: http://host.docker.internal:3030/webhook/waha, evento message.
- No usar 3033 ni 3034: eran destinos antiguos sin servicio y causaron ECONNREFUSED el 2026-09-06.
- Antes de cambiar puertos o diagnosticar falta de respuestas, ejecutar npm run check:waha y comprobar que el bot escucha en 3030. El estado WORKING de WAHA por si solo no garantiza que el bot reciba mensajes.
- Iniciar con npm start desde esta carpeta, sin sobrescribir PORT. Si se cambia un puerto intencionalmente, actualizar .env, .env.example, waha-config.json, este archivo y el webhook de WAHA conjuntamente.
- No guardar claves API ni contrasenas en documentacion o archivos versionados.
- negocio_local tiene alertas de correo mediante PHPMailer (mail/). SMTP: mail.terranovarestobar.com:465 con TLS, usuario info@terranovarestobar.com, destino terranova.restobar.2026@gmail.com. Clave unicamente en SMTP_PASSWORD de .env.
- Solo en este proyecto se resuelve el telefono de contactos @lid mediante mail/contact.js antes de enviar el correo. Conservar el identificador cuando WAHA no devuelva un numero y no bloquear respuestas del bot por esta consulta.
- Validar con npm test y npm run mail:verify; npm run mail:test envia un correo real y requiere autorizacion de envio. Mantener los avisos independientes de las respuestas de WhatsApp y conservar la cola SQLite entre reinicios.
