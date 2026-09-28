/**
 * Moinuddin.com Contact Form → Telegram
 * Deploy this file as a Cloudflare Worker.
 *
 * Required Worker secrets:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */

const ALLOWED_ORIGINS = [
  "https://moinuddin.com",
  "https://www.moinuddin.com"
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Method not allowed." },
        { status: 405, headers }
      );
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return Response.json(
        { success: false, error: "Telegram configuration is missing." },
        { status: 500, headers }
      );
    }

    try {
      const data = await request.json();

      const name = clean(data.name, 120);
      const email = clean(data.email, 180);
      const projectType = clean(data.project_type, 120);
      const budget = clean(data.budget, 120) || "Not specified";
      const message = clean(data.message, 3000);
      const page = clean(data.page, 500);
      const submittedAt = clean(data.submitted_at, 80);

      if (!name || !email || !projectType || !message) {
        return Response.json(
          { success: false, error: "Required fields are missing." },
          { status: 400, headers }
        );
      }

      const telegramText =
`🚀 NEW WEBSITE INQUIRY

👤 Name: ${name}
📧 Email: ${email}
🧩 Project: ${projectType}
💰 Budget: ${budget}

💬 Message:
${message}

🌐 Page: ${page || "Contact page"}
🕒 Submitted: ${submittedAt || new Date().toISOString()}`;

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: telegramText,
            disable_web_page_preview: true
          })
        }
      );

      const telegramData = await telegramResponse.json();

      if (!telegramResponse.ok || !telegramData.ok) {
        return Response.json(
          { success: false, error: "Telegram delivery failed." },
          { status: 502, headers }
        );
      }

      return Response.json(
        { success: true },
        { status: 200, headers }
      );
    } catch (error) {
      return Response.json(
        { success: false, error: "Invalid request." },
        { status: 400, headers }
      );
    }
  }
};
