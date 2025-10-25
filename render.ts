import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

// iCloud Mail setup (works with custom domain)
const transporter = nodemailer.createTransport({
  host: "smtp.mail.me.com",
  port: 587,
  secure: false, // use STARTTLS
  auth: {
    user: process.env.EMAIL_USER, // full address (e.g. you@yourdomain.com)
    pass: process.env.EMAIL_PASS, // app-specific password from Apple ID
  },
});

// Limit concurrent sends
let activeEmails = 0;
const MAX_CONCURRENT = 3;

// Function to send mail safely
async function sendEmailSafe(mailOptions: any) {
  if (activeEmails >= MAX_CONCURRENT) {
    throw new Error("Too many concurrent email requests");
  }

  activeEmails++;
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return info;
  } finally {
    activeEmails--;
  }
}

// POST route for sending emails
app.post("/send", async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const isHTML = /<\/?[a-z][\s\S]*>/i.test(body);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      ...(isHTML ? { html: body } : { text: body }),
    };

    const result = await sendEmailSafe(mailOptions);
    res.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UptimeRobot health endpoint
app.get("/", (_, res) => {
  res.send("✅ Server is alive and ready to send emails!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
