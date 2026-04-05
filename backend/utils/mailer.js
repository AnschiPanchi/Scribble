const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

// Tactical Mailer Verification
transporter.verify((error) => {
    if (error) {
        console.warn(`\x1b[31;1m✘ Tactical Mailer: OFFLINE (${error.message})\x1b[0m`);
    } else {
        console.log(`\x1b[32;1m✔ Tactical Mailer: ONLINE (Connection Verified)\x1b[0m`);
    }
});

exports.sendVerificationEmail = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"ScribbleX" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your ScribbleX Account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #27272a; background-color: #09090b; color: white; border-radius: 12px;">
         <h1 style="color: #6366f1; text-align: center;">SCRIBBLE X</h1>
         <p>You have been recruited and your account is ready to be initialized.</p>
         <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase;">Verify Access</a>
         </div>
         <p style="font-size: 12px; color: #71717a; text-align: center;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};
