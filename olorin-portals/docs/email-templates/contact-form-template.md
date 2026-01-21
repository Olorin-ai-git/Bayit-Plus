# Olorin.ai Contact Form Email Template

This template should be created in your EmailJS dashboard with the ID from `EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT`

> **Note:** The template ID is managed in `src/services/emailService.js` within the `EMAIL_CONFIG` object. This ensures consistency between your code and EmailJS dashboard.

## EmailJS Template Configuration

### Template ID
```
EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT = 'template_contact_reply'
```

**Current Value:** `template_contact_reply`

### Used in Code
```javascript
// In sendContactFormEmail function
await emailjs.send(
  EMAIL_CONFIG.SERVICE_ID,
  EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT,  // ← This is where the template ID is used
  templateParams
);
```

### Template Variables Used
- `{{from_name}}` - Contact person's full name
- `{{from_email}}` - Contact person's email address
- `{{company}}` - Company name (optional)
- `{{phone}}` - Phone number (optional)
- `{{subject}}` - Selected inquiry subject
- `{{message}}` - Contact message content
- `{{to_name}}` - Recipient name ("Olorin.ai Team")
- `{{to_email}}` - Destination email ("contact@olorin.ai")
- `{{contact_date}}` - Formatted submission date and time

## Email Template

### Subject Line
```
🔥 New Contact: {{subject}} - {{from_name}}
```

### Email Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
            color: #334155;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .contact-info {
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .info-row {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .info-label {
            font-weight: 600;
            min-width: 80px;
            color: #475569;
        }
        .info-value {
            color: #1e293b;
        }
        .message-section {
            margin-top: 25px;
        }
        .message-section h3 {
            color: #1e293b;
            font-size: 18px;
            margin-bottom: 12px;
        }
        .message-content {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .footer {
            background-color: #1e293b;
            color: #cbd5e1;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
        }
        .footer a {
            color: #60a5fa;
            text-decoration: none;
        }
        .priority-badge {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 10px;
        }
        .subject-badge {
            display: inline-block;
            background-color: #059669;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 New Contact Form Submission</h1>
            <p>Olorin.ai - AI Fraud Prevention Solutions</p>
        </div>
        
        <div class="content">
            <div class="subject-badge">{{subject}}</div>
            
            <div class="contact-info">
                <div class="info-row">
                    <span class="info-label">👤 Name:</span>
                    <span class="info-value">{{from_name}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📧 Email:</span>
                    <span class="info-value">
                        <a href="mailto:{{from_email}}" style="color: #3b82f6; text-decoration: none;">{{from_email}}</a>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">🏢 Company:</span>
                    <span class="info-value">{{company}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📱 Phone:</span>
                    <span class="info-value">
                        <a href="tel:{{phone}}" style="color: #3b82f6; text-decoration: none;">{{phone}}</a>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value">{{contact_date}}</span>
                </div>
            </div>
            
            <div class="message-section">
                <h3>💬 Message</h3>
                <div class="message-content">{{message}}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>
                <strong>Olorin.ai</strong> - Generative AI Fraud Prevention<br>
                185 Madison Ave., Cresskill 07626 USA<br>
                <a href="mailto:contact@olorin.ai">contact@olorin.ai</a> | 
                <a href="tel:+12013979142">+1 (201) 397-9142</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                This message was sent via the Olorin.ai contact form.<br>
                Reply directly to respond to the contact.
            </p>
        </div>
    </div>
</body>
</html>
```

### Plain Text Version (for fallback)
```
🤖 NEW CONTACT FORM SUBMISSION - OLORIN.AI

Subject: {{subject}}

CONTACT DETAILS:
==================
👤 Name: {{from_name}}
📧 Email: {{from_email}}
🏢 Company: {{company}}
📱 Phone: {{phone}}
📅 Submitted: {{contact_date}}

MESSAGE:
==================
{{message}}

---
OLORIN.AI - AI FRAUD PREVENTION SOLUTIONS
185 Madison Ave., Cresskill 07626 USA
Email: contact@olorin.ai | Phone: +1 (201) 397-9142

This message was sent via the Olorin.ai contact form.
Reply directly to respond to the contact.
```

## Auto-Reply Template (Optional)

You can also create an auto-reply template for customers:

### Template ID
Add this to `EMAIL_CONFIG` if implementing auto-reply:
```javascript
TEMPLATE_AUTO_REPLY: 'template_contact_form_reply'
```

### Subject Line
```
✅ Thank you for contacting Olorin.ai - We'll respond within 24 hours
```

### Auto-Reply Body
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You - Olorin.ai</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
            color: #334155;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .highlight {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            margin: 20px 0;
        }
        .contact-summary {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Message Received!</h1>
            <p>Thank you for contacting Olorin.ai</p>
        </div>
        
        <div class="content">
            <p>Dear {{from_name}},</p>
            
            <p>Thank you for reaching out to Olorin.ai regarding "<strong>{{subject}}</strong>". We've successfully received your message and our fraud prevention experts will review it shortly.</p>
            
            <div class="highlight">
                <strong>📞 Quick Response Guarantee:</strong><br>
                We commit to responding to all inquiries within 24 hours, with urgent security matters addressed within 4 hours.
            </div>
            
            <div class="contact-summary">
                <h3>📋 Your Message Summary:</h3>
                <p><strong>Subject:</strong> {{subject}}</p>
                <p><strong>Submitted:</strong> {{contact_date}}</p>
                <p><strong>Contact Email:</strong> {{from_email}}</p>
            </div>
            
            <p>In the meantime, feel free to:</p>
            <ul>
                <li>📖 Learn more about our <a href="https://olorin.ai/services" style="color: #3b82f6;">AI fraud prevention solutions</a></li>
                <li>📞 Call us directly at <a href="tel:+12013979142" style="color: #3b82f6;">+1 (201) 397-9142</a></li>
                <li>📧 Email us at <a href="mailto:contact@olorin.ai" style="color: #3b82f6;">contact@olorin.ai</a></li>
            </ul>
            
            <p>We look forward to helping you secure your business with cutting-edge AI technology.</p>
            
            <p>Best regards,<br>
            <strong>The Olorin.ai Team</strong><br>
            Generative AI Fraud Prevention Experts</p>
        </div>
    </div>
</body>
</html>
```

## Setup Instructions

1. **Login to EmailJS Dashboard** at https://www.emailjs.com/
2. **Go to Email Templates**
3. **Create New Template** with ID matching `EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT`
   - Current value: `template_contact_reply`
   - **Important:** Template ID must match the constant in `src/services/emailService.js`
4. **Copy the HTML content** above into the template editor
5. **Set the subject line** as specified
6. **Test the template** with sample data
7. **Save and activate** the template

### ⚠️ Important Note
If you change the template ID in `EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT`, make sure to update the corresponding template ID in your EmailJS dashboard to match.

## Testing Variables

Use these test values in EmailJS:
```json
{
  "from_name": "John Doe",
  "from_email": "john@example.com",
  "company": "TechCorp Inc.",
  "phone": "+1 555-0123",
  "subject": "Product Demo",
  "message": "I'm interested in learning more about your AI fraud prevention solutions for our e-commerce platform.",
  "to_name": "Olorin.ai Team",
  "to_email": "contact@olorin.ai",
  "contact_date": "December 15, 2024 at 2:30 PM"
}
``` 