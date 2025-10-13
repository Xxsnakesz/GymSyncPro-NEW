import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'onboarding@resend.dev'
  };
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const resetUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/reset-password?token=${resetToken}`;
    
    console.log(`[Resend] Attempting to send password reset email to: ${toEmail}`);
    console.log(`[Resend] From email: ${fromEmail}`);
    
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset Password - Idachi Fitness',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EAB308;">Reset Password Anda</h2>
          <p>Kami menerima permintaan untuk mereset password akun Anda di Idachi Fitness.</p>
          <p>Kode verifikasi Anda adalah:</p>
          <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #92400E; margin: 0; letter-spacing: 5px;">${resetToken}</h1>
          </div>
          <p>Kode ini akan kadaluarsa dalam 15 menit.</p>
          <p>Atau klik link berikut untuk langsung reset password:</p>
          <p><a href="${resetUrl}" style="background-color: #EAB308; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <p style="color: #666; font-size: 12px;">- Tim Idachi Fitness</p>
        </div>
      `
    });
    
    console.log(`[Resend] Email sent successfully.`, result);
    return result;
  } catch (error) {
    console.error('[Resend] Error sending password reset email:', error);
    throw error;
  }
}
