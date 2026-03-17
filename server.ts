
import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from 'nodemailer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Configuration (Gmail SMTP)
  const EMAIL_USER = process.env.EMAIL_USER; // Your Gmail address
  const EMAIL_PASS = process.env.EMAIL_PASS; // Your Gmail App Password

  console.log(`[SMTP] EMAIL_USER is ${EMAIL_USER ? 'DEFINED' : 'UNDEFINED'}`);
  console.log(`[SMTP] EMAIL_PASS is ${EMAIL_PASS ? 'DEFINED' : 'UNDEFINED'}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Test route for email
  app.get("/api/test-email", async (req, res) => {
    const testTo = req.query.to as string;
    if (!testTo) return res.status(400).send("Provide 'to' query param");

    try {
      const mailOptions = {
        from: `"ESEC Test" <${EMAIL_USER}>`,
        to: testTo,
        subject: "Test Email from ESEC Portal",
        html: "<h1>It works!</h1><p>This is a test email to verify the SMTP configuration.</p>",
      };
      const info = await transporter.sendMail(mailOptions);
      res.json({ success: true, info });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API routes
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields (to, subject, message)" });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      console.error("Email credentials are not configured");
      return res.status(500).json({ success: false, error: "Email service not configured. Please set EMAIL_USER and EMAIL_PASS." });
    }

    try {
      console.log(`Attempting to send email to: ${to} | Subject: ${subject}`);
      
      const mailOptions = {
        from: `"ESEC OD Portal" <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: message,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      
      res.json({ success: true, data: info });
    } catch (err: any) {
      console.error("Nodemailer Error:", err);
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
