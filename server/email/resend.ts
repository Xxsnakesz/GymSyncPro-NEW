import { Resend } from 'resend';

// Maintain independent clients for different email streams to prevent config clashes
let resendClientDefault: Resend | null = null;
let resendClientAdmin: Resend | null = null;
let resendClientVerification: Resend | null = null;

let fromEmailDefault: string | null = null;
let fromEmailAdmin: string | null = null;
let fromEmailVerification: string | null = null;

function ensureDefaultClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable is required for email functionality');
  if (!resendClientDefault) {
    resendClientDefault = new Resend(apiKey);
    fromEmailDefault = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }
  return { client: resendClientDefault!, fromEmail: fromEmailDefault! };
}

export async function getUncachableResendClient() {
  // Backward compatibility for existing callers (uses default stream)
  return ensureDefaultClient();
}

export function getResendClientForAdmin() {
  const apiKey = process.env.RESEND_API_KEY_ADMIN || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY or RESEND_API_KEY_ADMIN is required');
  if (!resendClientAdmin) {
    resendClientAdmin = new Resend(apiKey);
    fromEmailAdmin = process.env.RESEND_FROM_EMAIL_ADMIN
      || process.env.RESEND_FROM_EMAIL
      || 'onboarding@resend.dev';
  }
  const replyTo = process.env.RESEND_REPLY_TO_ADMIN || undefined;
  return { client: resendClientAdmin!, fromEmail: fromEmailAdmin!, replyTo };
}

export function getResendClientForVerification() {
  const apiKey = process.env.RESEND_API_KEY_VERIFICATION || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY or RESEND_API_KEY_VERIFICATION is required');
  if (!resendClientVerification) {
    resendClientVerification = new Resend(apiKey);
    fromEmailVerification = process.env.RESEND_FROM_EMAIL_VERIFICATION
      || process.env.RESEND_FROM_EMAIL
      || 'onboarding@resend.dev';
  }
  return { client: resendClientVerification!, fromEmail: fromEmailVerification! };
}

// Resolve base app URL strictly from environment or fallback to localhost
export function getAppBaseUrl() {
  return process.env.APP_URL || 'http://localhost:5000';
}

// Convert plain text to safe minimal HTML (escape + newline -> <br/>)
export function textToSafeHtml(txt: string): string {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

// Branded HTML wrapper similar to verification email styling
export function buildBrandedEmailHtml(
  title: string,
  bodyHtml: string,
): string {
  const brand = 'Idachi Fitness';
  const accent = '#EAB308';
  const dark = '#111827';
  const preheader = `${brand} — ${title}`.slice(0, 120);
  return `
  <div style="margin:0;padding:0;background:#0B1220">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">${preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0B1220" bgcolor="#0B1220">
      <tr>
        <td align="center" style="padding:36px 12px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.25)">
            <tr>
              <td style="background:${dark};padding:22px 28px" bgcolor="#111827">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left" style="color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;letter-spacing:.2px">${brand}</td>
                    <td align="right" style="color:#D1D5DB;font-family:Arial,Helvetica,sans-serif;font-size:12px">${new Date().toLocaleDateString()}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#FFFFFF;padding:28px" bgcolor="#FFFFFF">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;color:#6B7280;text-transform:uppercase;margin:0 0 10px 0">${brand}</div>
                <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#0F172A">${title}</h1>
                <div style="height:4px;width:64px;background:${accent};border-radius:4px"></div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.8;color:#1F2937;margin-top:18px">
                  ${bodyHtml}
                </div>
                <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 0 0"/>
                <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280">Email ini dikirim oleh <strong>${brand}</strong>. Balas email ini jika butuh bantuan.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

export function buildBrandedEmailHtmlWithCta(
  title: string,
  bodyHtml: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const btn = ctaText && ctaUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0 6px 0">
          <a href="${ctaUrl}"
            style="background:#EAB308;color:#111827;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-family:Arial,Helvetica,sans-serif;display:inline-block">
            ${ctaText}
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280">
          atau buka tautan ini: <a href="${ctaUrl}" style="color:#2563EB">${ctaUrl}</a>
        </td>
      </tr>
    </table>` : '';
  return buildBrandedEmailHtml(title, `${bodyHtml}${btn}`);
}

// Lightweight system template (distinct from admin): light header, label chip, neutral tone
export function buildSystemEmailHtml(
  label: string,
  title: string,
  bodyHtml: string,
  options?: { accent?: string }
): string {
  const brand = 'Idachi Fitness';
  const accent = options?.accent || '#2563EB'; // default blue for system
  const preheader = `${brand} — ${title}`.slice(0, 120);
  return `
  <div style="margin:0;padding:0;background:#F3F4F6">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">${preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F3F4F6" bgcolor="#F3F4F6">
      <tr>
        <td align="center" style="padding:32px 12px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB">
            <tr>
              <td style="padding:22px 24px 0 24px" bgcolor="#FFFFFF">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;margin:0 0 10px 0">${brand}</div>
                <div style="display:inline-block;padding:6px 10px;border:1px solid ${accent};color:${accent};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px">${label}</div>
                <h1 style="margin:6px 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:#0F172A">${title}</h1>
                <div style="height:3px;width:56px;background:${accent};border-radius:3px"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px" bgcolor="#FFFFFF">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.8;color:#1F2937">
                  ${bodyHtml}
                </div>
                <hr style="border:none;border-top:1px solid #E5E7EB;margin:22px 0 0 0"/>
                <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280">Email sistem otomatis dari ${brand}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const baseUrl = getAppBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log(`[Resend] Attempting to send password reset email to: ${toEmail}`);
    console.log(`[Resend] From: ${fromEmail}`);
    
    const body = `
      <p>Kami menerima permintaan untuk mereset password akun Anda di Idachi Fitness.</p>
      <p>Kode verifikasi Anda adalah:</p>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;padding:16px;border-radius:10px;text-align:center;margin:16px 0">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;letter-spacing:8px;color:#1D4ED8;font-weight:700">${resetToken}</div>
      </div>
      <p>Kode ini akan kadaluarsa dalam 15 menit.</p>
      <div style="text-align:center;margin:18px 0 6px 0">
        <a href="${resetUrl}" style="background:#2563EB;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-family:Arial,Helvetica,sans-serif;display:inline-block">Reset Password</a>
      </div>
      <div style="text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280">atau buka tautan ini: <a href="${resetUrl}" style="color:#2563EB">${resetUrl}</a></div>
      <p style="margin-top:18px;color:#6B7280;font-size:13px">Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `;
    const html = buildSystemEmailHtml('Reset Password', 'Reset Password Anda', body, { accent: '#2563EB' });
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset Password - Idachi Fitness',
      html,
    });
    
    console.log(`[Resend] Email sent successfully.`, result);
    return result;
  } catch (error) {
    console.error('[Resend] Error sending password reset email:', error);
    throw error;
  }
}

export async function sendVerificationEmail(toEmail: string, verificationCode: string) {
  try {
    const { client, fromEmail } = getResendClientForVerification();
    
    console.log(`[Resend] Attempting to send verification email to: ${toEmail}`);
    console.log(`[Resend] From: ${fromEmail}`);
    
    const body = `
      <p>Terima kasih telah mendaftar. Untuk melanjutkan, mohon verifikasi email Anda dengan kode berikut:</p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:24px;border-radius:12px;text-align:center;margin:20px 0">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:34px;letter-spacing:10px;color:#16A34A;font-weight:800">${verificationCode}</div>
      </div>
      <p>Kode verifikasi ini akan kadaluarsa dalam <strong>15 menit</strong>. Masukkan kode ini pada halaman verifikasi untuk mengaktifkan akun Anda.</p>
    `;
    const html = buildSystemEmailHtml('Verifikasi Akun', 'Konfirmasi Email Anda', body, { accent: '#16A34A' });
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Verifikasi Email Anda - Idachi Fitness',
      html,
    });
    
    console.log(`[Resend] Verification email sent successfully.`, result);
    return result;
  } catch (error) {
    console.error('[Resend] Error sending verification email:', error);
    throw error;
  }
}

export async function sendInactivityReminderEmail(toEmail: string, memberName: string, daysInactive: number) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    console.log(`[Resend] Attempting to send inactivity reminder email to: ${toEmail}`);
    console.log(`[Resend] From: ${fromEmail}`);
    
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Ayo Nge-gym Lagi! 💪 - Idachi Fitness',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #EAB308; font-size: 32px; margin: 0;">💪 Idachi Fitness 💪</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #92400E; margin-top: 0; text-align: center;">Hai ${memberName}!</h2>
            <p style="font-size: 18px; text-align: center; color: #78350F; margin: 20px 0;">
              <strong>Ayo nge-gym lagi! Jangan tunggu nanti — mulai hari ini! 💪</strong>
            </p>
          </div>
          
          <div style="background-color: #FFFBEB; padding: 20px; border-radius: 8px; border-left: 4px solid #EAB308;">
            <p style="color: #92400E; margin: 0;">
              Sudah ${daysInactive} hari kamu tidak terlihat di gym. Kami tahu hidup sibuk, tapi jangan biarkan rutinitas fitnesmu terbengkalai!
            </p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <p style="color: #78350F; font-size: 16px; margin-bottom: 20px;">
              <strong>Ingat: Konsistensi adalah kunci kesuksesan!</strong>
            </p>
            <p style="color: #666;">
              Tubuh yang kuat dimulai dari keputusan kecil setiap hari. Yuk, mulai lagi dari sekarang!
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getAppBaseUrl()}" 
               style="background-color: #EAB308; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Booking Class Sekarang
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 5px 0;">
              Kami tunggu kehadiranmu di Idachi Fitness!
            </p>
            <p style="color: #666; font-size: 12px; margin: 5px 0;">
              - Tim Idachi Fitness
            </p>
          </div>
        </div>
      `
    });
    
    console.log(`[Resend] Inactivity reminder email sent successfully to ${toEmail}`);
    return result;
  } catch (error) {
    console.error('[Resend] Error sending inactivity reminder email:', error);
    throw error;
  }
}
