import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields (to, subject, message)' });
  }

  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;

  if (!EMAIL_USER || !EMAIL_PASS) {
    return res.status(500).json({ success: false, error: 'Email credentials not configured' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    const info = await transporter.sendMail({
      from: `"ESEC Student On-Duty Management System" <${EMAIL_USER}>`,
      to,
      subject,
      html: message
    });

    return res.status(200).json({ success: true, data: info });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
