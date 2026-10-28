import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}


async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleSendTicketEmail(request: Request): Promise<Response> {
  try {
    const payload = (await request.json().catch(() => ({}))) as any;
    const { recipientEmail, subject, htmlBody, qrCodeDataUrl, ticketId } = payload;

    if (!recipientEmail || !htmlBody) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing recipientEmail or htmlBody" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
    const port = Number(process.env["SMTP_PORT"] || 587);
    const user = (process.env["SMTP_USER"] || "ecomove.teams@gmail.com").trim();
    const rawPass = (process.env["SMTP_PASS"] || "abmwrmjjlknmwuai").trim();
    const pass = rawPass.replace(/\s+/g, "");
    const from = process.env["SMTP_FROM"] || `"Eco-Move Nagpur" <${user}>`;
    const resendKey = process.env["RESEND_API_KEY"];

    if (resendKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: from.includes("@") ? from : "Eco-Move <onboarding@resend.dev>",
          to: [recipientEmail],
          subject,
          html: htmlBody,
        }),
      });
      const resendData = await resendRes.json();
      return new Response(
        JSON.stringify({ success: true, provider: "resend", data: resendData }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if ((host || user.includes("gmail")) && user && pass) {
      const nodemailer = await import("nodemailer");
      const transporter = host?.includes("gmail") || user.includes("gmail.com")
        ? nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
          })
        : nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          });

      const qrBase64Clean = qrCodeDataUrl ? qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, "") : null;
      const attachments = qrBase64Clean
        ? [
            {
              filename: `qrcode-${ticketId || "pass"}.png`,
              content: Buffer.from(qrBase64Clean, "base64"),
              cid: "ticketqr",
            },
          ]
        : [];

      const info = await transporter.sendMail({
        from,
        to: recipientEmail,
        subject,
        html: htmlBody,
        attachments,
      });

      return new Response(
        JSON.stringify({
          success: true,
          provider: "nodemailer",
          messageId: info.messageId,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        requiresConfig: true,
        message: "SMTP credentials not configured.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/send-ticket-email" && request.method === "POST") {
        return await handleSendTicketEmail(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
