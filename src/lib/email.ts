import nodemailer from 'nodemailer';

interface SendResetEmailOptions {
  toEmail: string;
  userName: string;
  verificationCode: string;
  expiresInMinutes: number;
}

export interface EmailSendResult {
  sent: boolean;
  method: 'SMTP' | 'GMAIL' | 'RESEND' | 'CONSOLE_DEV';
  error?: string;
  devOtp?: string;
}

/**
 * Builds the HTML content for the password reset verification email.
 */
function buildResetEmailHtml(userName: string, verificationCode: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Code - Madin School of Excellence</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1528; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1528; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.35);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #091224 0%, #172a4d 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #d97706;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Madin School of Excellence</h1>
              <p style="margin: 6px 0 0 0; color: #fbbf24; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">SPR Administrative & Evaluation Portal</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Password Recovery Request</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>${userName || 'User'}</strong>,<br/>
                We received a request to reset the password for your SPR portal account. Use the 6-digit verification code below to complete the reset:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 20px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Your 6-Digit OTP Code</div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0f172a; padding: 4px 0;">
                      ${verificationCode}
                    </div>
                    <div style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 6px;">
                      ⏱ Expires in ${expiresInMinutes} minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request a password reset, please ignore this email or notify your system administrator immediately. Your password remains completely unchanged until verified with this code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.4;">
                © ${new Date().getFullYear()} Madin School of Excellence. All rights reserved.<br/>
                Encrypted Institutional Authentication Service
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches a secure 6-digit verification code to the user's email.
 * Supports:
 * 1. Resend API (via RESEND_API_KEY)
 * 2. Gmail SMTP (via GMAIL_USER + GMAIL_APP_PASSWORD)
 * 3. Custom SMTP (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 4. Fallback: Security console logging & Development mode OTP return
 */
export async function sendPasswordResetVerificationEmail(options: SendResetEmailOptions): Promise<EmailSendResult> {
  const { toEmail, userName, verificationCode, expiresInMinutes } = options;

  console.log(`[AUTH-SECURITY] Password Reset Code generated for ${toEmail} (${userName}): [${verificationCode}] (Expires in ${expiresInMinutes} mins)`);

  const htmlContent = buildResetEmailHtml(userName, verificationCode, expiresInMinutes);
  const textContent = `Madin School of Excellence - SPR Portal\n\nPassword Reset Verification Code: ${verificationCode}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request this reset, please ignore this email.`;
  const subject = `Your SPR Portal Verification Code: ${verificationCode}`;
  const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || 'no-reply@madin.edu.in';

  // 1. Try Resend API if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      console.log(`[EMAIL-SERVICE] Dispatching verification email via Resend API to ${toEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress.includes('@') ? fromAddress : 'Madin SPR Portal <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (res.ok) {
        console.log(`[EMAIL-SERVICE] Email dispatched successfully via Resend to ${toEmail}.`);
        return { sent: true, method: 'RESEND' };
      } else {
        const errorText = await res.text();
        console.error('[EMAIL-SERVICE] Resend API error response:', errorText);
      }
    } catch (err: any) {
      console.error('[EMAIL-SERVICE] Failed to send email via Resend:', err.message);
    }
  }

  // 2. Try Gmail SMTP / App Password if configured
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
  if (gmailUser && gmailAppPass) {
    try {
      console.log(`[EMAIL-SERVICE] Dispatching verification email via Gmail SMTP (${gmailUser}) to ${toEmail}...`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPass.replace(/\s+/g, ''), // Strip spaces from Google App Password
        },
      });

      await transporter.sendMail({
        from: `"Madin School of Excellence" <${gmailUser}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL-SERVICE] Email sent successfully via Gmail SMTP to ${toEmail}.`);
      return { sent: true, method: 'GMAIL' };
    } catch (err: any) {
      console.error('[EMAIL-SERVICE] Gmail SMTP dispatch error:', err.message);
    }
  }

  // 3. Try Standard SMTP if configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      console.log(`[EMAIL-SERVICE] Dispatching verification email via SMTP (${smtpHost}:${smtpPort}) to ${toEmail}...`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromAddress.includes('<') ? fromAddress : `"Madin School of Excellence" <${fromAddress}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL-SERVICE] Email sent successfully via custom SMTP to ${toEmail}.`);
      return { sent: true, method: 'SMTP' };
    } catch (err: any) {
      console.error('[EMAIL-SERVICE] Standard SMTP dispatch error:', err.message);
    }
  }

  // 4. Fallback for Local / Testing / Non-configured environments
  console.log(`[EMAIL-SERVICE] No active SMTP/Gmail credentials configured in .env. OTP logged to console: [${verificationCode}]`);
  return {
    sent: false,
    method: 'CONSOLE_DEV',
    devOtp: verificationCode,
    error: 'SMTP email credentials are not yet configured in .env',
  };
}
