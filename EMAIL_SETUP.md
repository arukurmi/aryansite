# Email Setup Guide

## EmailJS Setup (Recommended - Free & Easy)

1. **Create EmailJS Account**
   - Go to https://www.emailjs.com/
   - Sign up for a free account

2. **Create Email Service**
   - Go to "Email Services" in your dashboard
   - Add your email service (Gmail, Outlook, etc.)
   - Follow the setup instructions

3. **Create Email Template**
   - Go to "Email Templates" in your dashboard
   - Create a new template with these variables:
     - `{{name}}` - Sender's name
     - `{{email}}` - Sender's email
     - `{{subject}}` - Message subject
     - `{{message}}` - Message content

4. **Get Your IDs**
   - Service ID: Found in "Email Services"
   - Template ID: Found in "Email Templates"
   - Public Key: Found in "Account" > "General"

5. **Create .env.local file**
   ```
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
   ```

## Alternative: Next.js API Route (More Control)

If you prefer to use your own email service, you can create an API route instead.

1. Create `pages/api/contact.js`
2. Use nodemailer or similar library
3. Configure with your SMTP settings

## Testing

1. Start your development server: `npm run dev`
2. Go to the contact section on your website
3. Fill out the form and submit
4. Check your email for the message

## Troubleshooting

- Make sure your environment variables are set correctly
- Check the browser console for any errors
- Verify your EmailJS template has the correct variable names
- Ensure your email service is properly configured
