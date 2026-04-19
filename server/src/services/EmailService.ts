/**
 * EmailService
 *
 * Wraps nodemailer. All email sending goes through here.
 * The transporter is created lazily (first send) so tests that don't
 * need email don't pay the connection overhead.
 *
 * In test environment, all emails are silently swallowed (no real sends).
 */

import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export const EmailService = {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    // Swallow in test — we assert token values in DB, not emails
    if (env.isTest) return;

    const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${token}`;

    await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: 'Verify your StevensConnect account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to StevensConnect</h2>
          <p>Click the button below to verify your @stevens.edu email address.</p>
          <p>
            <a href="${verifyUrl}"
               style="display:inline-block;padding:12px 24px;background:#c11414;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
              Verify Email
            </a>
          </p>
          <p style="color:#666;font-size:13px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color:#666;font-size:13px;">
            Or copy this URL: ${verifyUrl}
          </p>
        </div>
      `,
    });
  },
};
