import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    environment: 'vercel-serverless',
    emailUser: !!process.env.EMAIL_USER,
    emailPass: !!process.env.EMAIL_PASS,
    smtpService: process.env.SMTP_SERVICE || 'not set (defaulting to gmail)',
    nodeVersion: process.version
  });
}
