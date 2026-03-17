
import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from 'nodemailer';
import 'dotenv/config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Email credentials are not configured (EMAIL_USER/EMAIL_PASS)");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return { transporter, EMAIL_USER };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log SMTP status on startup
  console.log(`[SMTP] EMAIL_USER is ${process.env.EMAIL_USER ? 'DEFINED' : 'UNDEFINED'}`);
  console.log(`[SMTP] EMAIL_PASS is ${process.env.EMAIL_PASS ? 'DEFINED' : 'UNDEFINED'}`);

  // Test route for email
  app.get("/api/test-email", async (req, res) => {
    const testTo = req.query.to as string;
    if (!testTo) return res.status(400).send("Provide 'to' query param");

    try {
      const { transporter, EMAIL_USER } = getTransporter();
      const mailOptions = {
        from: `"ESEC Test" <${EMAIL_USER}>`,
        to: testTo,
        subject: "Test Email from ESEC Portal",
        html: "<h1>It works!</h1><p>This is a test email to verify the SMTP configuration.</p>",
      };
      const info = await transporter.sendMail(mailOptions);
      res.json({ success: true, info });
    } catch (err: any) {
      console.error("[SMTP Test Error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify SMTP connection
  app.get("/api/verify-smtp", async (req, res) => {
    try {
      const { transporter } = getTransporter();
      await transporter.verify();
      res.json({ success: true, message: "SMTP connection verified successfully" });
    } catch (err: any) {
      console.error("[SMTP Verify Error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API routes
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields (to, subject, message)" });
    }

    try {
      const { transporter, EMAIL_USER } = getTransporter();
      console.log(`[SMTP] Attempting to send email to: ${to}`);
      console.log(`[SMTP] Subject: ${subject}`);
      
      const mailOptions = {
        from: `"ESEC OD Portal" <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: message,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("[SMTP] Email sent successfully!");
      console.log("[SMTP] Message ID:", info.messageId);
      console.log("[SMTP] Response:", info.response);
      
      res.json({ success: true, data: info });
    } catch (err: any) {
      console.error("[SMTP Error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
