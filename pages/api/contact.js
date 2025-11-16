import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { name, email, subject, message } = req.body

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' })
  }

  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: 'arukurmi22@gmail.com',
      subject: `Portfolio Contact: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      replyTo: email,
    }
    // Send the email to the site owner
    await transporter.sendMail(mailOptions)

    const autoReplyOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Thank you for contacting Aryansh Kurmi',
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for contacting me. I've received your message and will get back to you within 24 hours.</p>
        <p>Best regards,<br>Aryansh Kurmi</p>
      `,
    }

    await transporter.sendMail(autoReplyOptions)

    res.status(200).json({ message: 'Email sent successfully' })
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Email error:', error)
    res.status(500).json({ message: 'Failed to send email' })
  }
}
// add more comments to it