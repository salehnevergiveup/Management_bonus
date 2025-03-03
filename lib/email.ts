import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendInvitationEmail(email: string, invitationLink: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const fullInvitationLink = `${baseUrl}${invitationLink}`;
   
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to: email,
    subject: 'Invitation to join our application',
    html: `
      <div>
        <h2>You've been invited!</h2>
        <p>Please click the link below to set up your account:</p>
        <a href="${fullInvitationLink}">Accept Invitation</a>
        <p>This invitation link will expire in 24 hours.</p>
      </div>
    `,
  });
}