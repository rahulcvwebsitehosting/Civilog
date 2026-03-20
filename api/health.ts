import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let verified = false;
  let smtpError = null;
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.verify();
    verified = true;
  } catch (err: any) {
    smtpError = err.message;
  }
  return res.status(200).json({
    status: 'ok',
    smtp: { verified, error: smtpError, user: process.env.EMAIL_USER ? 'Configured' : 'Missing' }
  });
}
