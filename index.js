const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3030;
const WAHA_URL = process.env.WAHA_URL || "http://localhost:3031";
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const WAHA_SESSION = process.env.WAHA_SESSION || "pry";

const sesiones = new Map();

const MENU_PRINCIPAL = `
👋 *¡Bienvenido a Terranova Restobar!*

Tenemos estas opciones para ti:

1️⃣ Promoción del día
2️⃣ Haz tu pedido
3️⃣ Ver menú por categorías
4️⃣ Dirección
5️⃣ Horario de atención
6️⃣ Carta digital
7️⃣ Hablar con un asesor

Escribe el número de la opción que deseas.
`.trim();

const MENU_CATEGORIAS = `
🍽️ *MENÚ TERRANOVA*

1️⃣ Alitas
2️⃣ Hamburguesas
3️⃣ Salchipapas
4️⃣ Piqueos
5️⃣ Waffles y crepes
6️⃣ Bebidas
0️⃣ Volver al menú principal

Escribe una opción.
`.trim();

const CATEGORIAS = {
  "1": `
🍗 *ALITAS TERRANOVA*

• 6 alitas
• 8 alitas
• 10 alitas

Sabores:
🔥 BBQ
🔥 Acevichadas
🔥 Maracuyá
🔥 Picantes

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim(),

  "2": `
🍔 *HAMBURGUESAS*

• Hamburguesa clásica
• Hamburguesa con queso
• Hamburguesa especial Terranova
• Club Sandwich

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim(),

  "3": `
🍟 *SALCHIPAPAS*

• Salchipapa clásica
• Salchiqueso
• Salchipapa con huevo
• Salchipapa especial con tocino

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim(),

  "4": `
🧀 *PIQUEOS*

• Tequeños
• Pechucubes
• Nuggets
• Enchiladas
• Piqueos para compartir

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim(),

  "5": `
🧇 *WAFFLES Y CREPES*

• Waffles dulces
• Crepes dulces
• Waffle con frutas
• Crepe con chocolate
• Combos de waffle + crepe

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim(),

  "6": `
🥤 *BEBIDAS*

• Jugos naturales
• Frozen
• Frappés
• Refrescos
• Cócteles

Escribe *pedido* para realizar tu pedido.
Escribe *0* para volver.
`.trim()
};

function normalizarTexto(texto = "") {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function enviarTexto(chatId, text) {
  await axios.post(
    `${WAHA_URL}/api/sendText`,
    {
      session: WAHA_SESSION,
      chatId,
      text
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY
      },
      timeout: 15000
    }
  );
}

async function marcarComoLeido(chatId, messageId) {
  try {
    await axios.post(
      `${WAHA_URL}/api/sendSeen`,
      {
        session: WAHA_SESSION,
        chatId,
        messageIds: messageId ? [messageId] : undefined
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY
        }
      }
    );
  } catch (error) {
    console.error(
      "No se pudo marcar como leído:",
      error.response?.data || error.message
    );
  }
}

async function procesarMenuPrincipal(chatId, opcion) {
  switch (opcion) {
    case "1":
      await enviarTexto(
        chatId,
        `
🔥 *PROMO DEL DÍA*

Consulta nuestra promoción vigente y disfruta los mejores platos de Terranova.

Escribe *pedido* para empezar tu pedido.
Escribe *menu* para volver al inicio.
        `.trim()
      );
      break;

    case "2":
      sesiones.set(chatId, { estado: "esperando_pedido" });

      await enviarTexto(
        chatId,
        `
🛒 *HAZ TU PEDIDO*

Escríbenos lo siguiente:

• Producto:
• Cantidad:
• Sabor:
• Dirección:
• Forma de pago:

Ejemplo:

10 alitas BBQ
1 salchipapa
Av. Ejemplo 123
Pago con Yape

Un asesor confirmará tu pedido.
        `.trim()
      );
      break;

    case "3":
      sesiones.set(chatId, { estado: "categorias" });
      await enviarTexto(chatId, MENU_CATEGORIAS);
      break;

    case "4":
      await enviarTexto(
        chatId,
        `
📍 *DIRECCIÓN*

Terranova Restobar
Los Olivos, Lima.

Estamos a dos cuadras de la Municipalidad de Los Olivos.

Escribe *menu* para volver al inicio.
        `.trim()
      );
      break;

    case "5":
      await enviarTexto(
        chatId,
        `
🕐 *HORARIO DE ATENCIÓN*

🥞 Desayunos:
Lunes a sábado
8:00 a. m. a 12:00 p. m.

🍔 Restobar:
Lunes a sábado
5:00 p. m. a 12:00 a. m.

Escribe *menu* para volver al inicio.
        `.trim()
      );
      break;

    case "6":
      await enviarTexto(
        chatId,
        `
📖 *CARTA DIGITAL*

Puedes revisar nuestra carta aquí:

${process.env.CARTA_URL}

Escribe *menu* para volver al inicio.
        `.trim()
      );
      break;

    case "7":
      sesiones.set(chatId, { estado: "asesor" });

      await enviarTexto(
        chatId,
        `
👨‍💼 *ATENCIÓN DE UN ASESOR*

En breve una persona de nuestro equipo continuará la conversación.

También puedes comunicarte al:
📲 +51 947 406 173

Para volver al bot, escribe *menu*.
        `.trim()
      );
      break;

    default:
      await enviarTexto(
        chatId,
        `No reconocí esa opción 😅\n\n${MENU_PRINCIPAL}`
      );
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Terranova WhatsApp Bot"
  });
});

app.post("/webhook/waha", async (req, res) => {
  // Contestamos rápido a WAHA para evitar reintentos.
  res.sendStatus(200);

  try {
    const evento = req.body;

    if (evento.event !== "message") {
      return;
    }

    const payload = evento.payload || {};

    // Ignorar mensajes enviados por el propio negocio.
    if (payload.fromMe === true) {
      return;
    }

    const chatId = payload.from || payload.chatId;
    const messageId = payload.id;
    const texto = normalizarTexto(payload.body);

    if (!chatId || !texto) {
      return;
    }

    // Ignorar grupos.
    if (chatId.endsWith("@g.us")) {
      return;
    }

    console.log(`[MENSAJE] ${chatId}: ${texto}`);

    await marcarComoLeido(chatId, messageId);

    if (
      ["hola", "buenas", "menu", "menú", "inicio", "ayuda"].includes(texto)
    ) {
      sesiones.set(chatId, { estado: "principal" });
      await enviarTexto(chatId, MENU_PRINCIPAL);
      return;
    }

    if (texto === "pedido" || texto === "pedir") {
      sesiones.set(chatId, { estado: "esperando_pedido" });

      await enviarTexto(
        chatId,
        `
🛒 Escríbenos tu pedido indicando:

• Producto
• Cantidad
• Dirección
• Forma de pago

Cuando termines, un asesor lo confirmará.
        `.trim()
      );

      return;
    }

    const sesionUsuario = sesiones.get(chatId) || {
      estado: "principal"
    };

    if (sesionUsuario.estado === "asesor") {
      // No responder automáticamente mientras atiende una persona.
      return;
    }

    if (sesionUsuario.estado === "esperando_pedido") {
      sesiones.set(chatId, {
        estado: "asesor",
        pedido: payload.body
      });

      await enviarTexto(
        chatId,
        `
✅ *¡Recibimos tu pedido!*

Un asesor de Terranova revisará los productos, el precio y la disponibilidad antes de confirmarlo.

Para regresar al menú automático escribe *menu*.
        `.trim()
      );

      console.log(`[NUEVO PEDIDO] ${chatId}: ${payload.body}`);
      return;
    }

    if (sesionUsuario.estado === "categorias") {
      if (texto === "0") {
        sesiones.set(chatId, { estado: "principal" });
        await enviarTexto(chatId, MENU_PRINCIPAL);
        return;
      }

      if (CATEGORIAS[texto]) {
        sesiones.set(chatId, {
          estado: "detalle_categoria",
          categoria: texto
        });

        await enviarTexto(chatId, CATEGORIAS[texto]);
        return;
      }

      await enviarTexto(
        chatId,
        `Selecciona una opción válida.\n\n${MENU_CATEGORIAS}`
      );
      return;
    }

    if (sesionUsuario.estado === "detalle_categoria") {
      if (texto === "0") {
        sesiones.set(chatId, { estado: "categorias" });
        await enviarTexto(chatId, MENU_CATEGORIAS);
        return;
      }
    }

    if (/^[1-7]$/.test(texto)) {
      sesiones.set(chatId, { estado: "principal" });
      await procesarMenuPrincipal(chatId, texto);
      return;
    }

    await enviarTexto(chatId, MENU_PRINCIPAL);
  } catch (error) {
    console.error(
      "Error procesando webhook:",
      error.response?.data || error.message
    );
  }
});

app.listen(PORT, () => {
  console.log(`Bot Terranova ejecutándose en http://localhost:${PORT}`);
  console.log(`Webhook: http://host.docker.internal:${PORT}/webhook/waha`);
});