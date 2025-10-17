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

  if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
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

export async function sendVerificationEmail(toEmail: string, verificationCode: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    console.log(`[Resend] Attempting to send verification email to: ${toEmail}`);
    console.log(`[Resend] From email: ${fromEmail}`);
    
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Verifikasi Email Anda - Idachi Fitness',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EAB308;">Selamat Datang di Idachi Fitness!</h2>
          <p>Terima kasih telah mendaftar. Untuk melanjutkan, mohon verifikasi email Anda dengan kode berikut:</p>
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h1 style="color: #92400E; margin: 0; letter-spacing: 8px; font-size: 36px;">${verificationCode}</h1>
          </div>
          <p>Kode verifikasi ini akan kadaluarsa dalam <strong>15 menit</strong>.</p>
          <p>Masukkan kode ini pada halaman verifikasi untuk mengaktifkan akun Anda.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Jika Anda tidak mendaftar di Idachi Fitness, abaikan email ini.</p>
          <p style="color: #666; font-size: 12px;">- Tim Idachi Fitness</p>
        </div>
      `
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
    console.log(`[Resend] From email: ${fromEmail}`);
    
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
            <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}" 
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
