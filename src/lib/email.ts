import { Resend } from 'resend';
import type { Locale } from '@/lib/i18n/config';
import { getMessagesFor, type Messages } from '@/lib/i18n/messages';

/** Branded card with a big OTP in the middle; shared by every code email. */
function renderOtpEmail({ m, locale, name, intro, otp, footnote }: { m: Messages; locale: Locale; name: string; intro: string; otp: string; footnote: string }) {
  return `
        <div lang="${locale}" style="font-family: 'Segoe UI', 'Nirmala UI', 'Noto Sans Bengali', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background-color: #7c3aed; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 24px; line-height: 1; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2);">
              📊
            </div>
            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 4px; letter-spacing: -0.025em;">Expensify</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 600; margin: 0;">${m.email.tagline}</p>
          </div>

          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
            <p style="margin-top: 0; font-size: 14px; color: #334155; line-height: 1.6;">${m.email.hello} <strong>${name}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px;">${intro}</p>

            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.15em; color: #7c3aed; padding: 12px 28px; background-color: #f5f3ff; border-radius: 12px; border: 1px dashed #c084fc; line-height: 1;">
                ${otp}
              </span>
            </div>

            <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 0;">${footnote}</p>
          </div>

          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0;">${m.email.footer}</p>
            <p style="margin: 0;">&copy; 2026 Expensify. ${m.email.rights}</p>
          </div>
        </div>
      `;
}

async function sendEmail(to: string, subject: string, html: string, devLog: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️ RESEND_API_KEY environment variable is not configured. Email not sent. ${devLog}`);
    return { success: false, message: 'Email service not configured.' };
  }

  const resend = new Resend(apiKey);
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  try {
    const data = await resend.emails.send({ from: emailFrom, to, subject, html });
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to send email "${subject}":`, error);
    return { success: false, error };
  }
}

export async function sendOTPEmail(email: string, name: string, otp: string, locale: Locale = 'en') {
  const m = getMessagesFor(locale);
  return sendEmail(
    email,
    m.email.verifySubject,
    renderOtpEmail({ m, locale, name, intro: m.email.verifyIntro, otp, footnote: m.email.verifyFootnote }),
    `OTP for ${email} (${name}) is: ${otp}`,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  otp: string,
  validMinutes: number,
  locale: Locale = 'en',
) {
  const m = getMessagesFor(locale);
  return sendEmail(
    email,
    m.email.resetSubject,
    renderOtpEmail({ m, locale, name, intro: m.email.resetIntro(validMinutes), otp, footnote: m.email.resetFootnote }),
    `Password reset code for ${email} (${name}) is: ${otp}`,
  );
}
