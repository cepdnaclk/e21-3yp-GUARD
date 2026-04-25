import nodemailer from "nodemailer";
import os from "os";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports (TLS via STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Returns the best LAN IPv4 address for the host machine, skipping virtual
 * adapters (VMware, Hyper-V, WSL, loopback) so a phone on the same Wi-Fi
 * can actually reach the dev server.
 * TEMP: used so verification links work from a phone on the same network.
 */
const getLocalIp = () => {
  const ifaces = os.networkInterfaces();
  const SKIP = /vmware|vmnet|hyper-v|vethernet|wsl|loopback/i;
  let fallback = "localhost";

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (SKIP.test(name)) continue;
    for (const iface of addrs) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address; // first real adapter (Wi-Fi / Ethernet)
      }
    }
    // remember any non-internal IPv4 as fallback even if adapter name looks odd
    for (const iface of addrs) {
      if (iface.family === "IPv4" && !iface.internal && fallback === "localhost") {
        fallback = iface.address;
      }
    }
  }
  return fallback;
};

/**
 * Send an email-verification link to a newly registered user.
 * @param {string} toEmail   - Recipient email address
 * @param {string} fullName  - Recipient's display name
 * @param {string} token     - The raw verification token (will be URL-encoded)
 */
export const sendVerificationEmail = async (toEmail, fullName, token) => {
  // TEMP: Force use of host LAN IP so the link works from a phone.
  // We ignore process.env.FRONTEND_URL here temporarily because Node might not
  // reload the .env file without a full backend restart.
  // Revert back when done: const baseUrl = process.env.FRONTEND_URL || `http://${getLocalIp()}:5173`;
  const baseUrl = `http://${getLocalIp()}:5173`;
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: `"G.U.A.R.D System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Verify your G.U.A.R.D account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; }
            .body { padding: 32px; color: #333333; }
            .body p { line-height: 1.6; }
            .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #1a73e8; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }
            .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888888; text-align: center; }
            .link-fallback { word-break: break-all; color: #1a73e8; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>G.U.A.R.D</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>Thank you for registering with G.U.A.R.D. Please click the button below to verify your email address. This link will expire in <strong>24 hours</strong>.</p>
              <a href="${verifyUrl}" class="btn">Verify Email</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p class="link-fallback">${verifyUrl}</p>
              <p>If you did not create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} G.U.A.R.D — Aquatic Monitoring System
            </div>
          </div>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
