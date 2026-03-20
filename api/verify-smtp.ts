import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.verify();
    return res.status(200).json({ success: true, message: 'SMTP connection verified successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
