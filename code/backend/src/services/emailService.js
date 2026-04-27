import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


/**
 * Send a 6-digit email-verification code to a newly registered user.
 * @param {string} toEmail   - Recipient email address
 * @param {string} fullName  - Recipient's display name
 * @param {string} code      - The 6-digit verification code
 */
export const sendVerificationEmail = async (toEmail, fullName, code) => {
  const mailOptions = {
    from: `"G.U.A.R.D System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your G.U.A.R.D Email Verification Code",
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
            .code-box { background: #f4f4f4; border: 2px dashed #1a73e8; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a73e8; }
            .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>Thank you for registering with G.U.A.R.D. Use the verification code below to activate your account:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in <strong>24 hours</strong>. Do not share it with anyone.</p>
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

/**
 * Send an alert notification email when a sensor reading is out of range.
 */
export const sendAlertEmail = async (toEmail, tankName, alertType, value) => {
  const mailOptions = {
    from: `"G.U.A.R.D Alert" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `🚨 ALERT: ${tankName} - ${alertType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fafafa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e1e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #d32f2f; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1.5px; }
            .body { padding: 32px; color: #333333; }
            .alert-box { background: #fff5f5; border: 1px solid #ffcdd2; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .alert-box .type { font-size: 14px; color: #d32f2f; font-weight: bold; margin-bottom: 8px; }
            .alert-box .value { font-size: 32px; color: #c62828; font-weight: 800; }
            .footer { background: #f5f5f5; padding: 16px; font-size: 12px; color: #757575; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>System Alert</h1>
            </div>
            <div class="body">
              <p>Critical alert detected for tank: <strong>${tankName}</strong></p>
              <div class="alert-box">
                <div class="type">${alertType.toUpperCase()}</div>
                <div class="value">${value}</div>
              </div>
              <p>Please check the system immediately to ensure the safety of the aquatic environment.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/alerts" style="color: #1a73e8; font-weight: 600;">View all alerts in Dashboard →</a></p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} G.U.A.R.D — Advanced Aquatic Protection
            </div>
          </div>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send a 6-digit password reset code.
 */
export const sendPasswordResetEmail = async (toEmail, fullName, code) => {
  const mailOptions = {
    from: `"G.U.A.R.D System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your G.U.A.R.D Password Reset Code",
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
            .code-box { background: #f4f4f4; border: 2px dashed #1a73e8; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a73e8; }
            .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>We received a request to reset your password. Here is your 6-digit verification code:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
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
