import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, error: 'Recipient email is required' });
  }
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"ESEC OD Portal Test" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'SMTP Test Email',
      text: 'This is a test email from the ESEC OD Portal SMTP configuration check.',
      html: '<b>This is a test email from the ESEC OD Portal SMTP configuration check.</b>'
    });
    return res.status(200).json({ success: true, message: 'Test email sent successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
