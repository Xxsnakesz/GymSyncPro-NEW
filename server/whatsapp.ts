import { storage } from "./storage";

export function normalizePhone(input?: string): string | undefined {
  if (!input) return undefined;
  let p = input.replace(/\s|-/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("62")) return "+" + p;
  if (p.startsWith("0")) return "+62" + p.slice(1);
  // Fallback: assume already in national without +, try prefix +62
  if (/^\d{9,15}$/.test(p)) return "+62" + p;
  return undefined;
}

export async function sendWhatsAppText(toPhone: string, body: string, previewUrl = false) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    const err = new Error("WhatsApp Cloud API is not configured");
    // @ts-ignore
    err.status = 503;
    throw err;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body, preview_url: previewUrl },
  } as any;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`WhatsApp API error: ${resp.status} ${text}`);
    // @ts-ignore
    err.status = resp.status === 401 || resp.status === 403 ? 502 : 500;
    throw err;
  }

  return resp.json().catch(() => ({ success: true }));
}
