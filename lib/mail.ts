import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendPasswordResetOtpEmail(args: {
  to: string;
  name: string;
  otp: string;
}) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("Missing MAIL_FROM or SMTP_USER");
  }

  await transporter.sendMail({
    from,
    to: args.to,
    subject: "FocusLMS Password Reset OTP",
    text: `Hello ${args.name},

Your FocusLMS password reset code is: ${args.otp}

This code expires in 15 minutes.
If you request a new code, the previous code becomes invalid.

If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>FocusLMS Password Reset</h2>
        <p>Hello ${args.name},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0;">
          ${args.otp}
        </div>
        <p>This code expires in <strong>15 minutes</strong>.</p>
        <p>If you request another code, the previous one becomes invalid immediately.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}