
import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Resend API Setup
  // Use environment variable if available, otherwise fallback to the provided key for this deployment
  const RESEND_KEY = process.env.RESEND_API_KEY || 're_Wu19m8Ld_A9HoQtvdS1qREXxNhSNjEso2';
  const resend = new Resend(RESEND_KEY);

  // API routes
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields (to, subject, message)" });
    }

    try {
      console.log(`Attempting to send email to: ${to} | Subject: ${subject}`);
      const { data, error } = await resend.emails.send({
        from: 'ESEC OD Portal <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: message, // Message is already HTML from the frontend
      });

      if (error) {
        console.error("Resend Error:", error);
        return res.status(400).json({ success: false, error });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error("Server Error:", err);
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
