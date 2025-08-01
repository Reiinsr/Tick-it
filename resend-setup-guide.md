# Resend.com Custom Domain Setup Guide for Tick-it

This guide will help you configure Resend.com with your custom domain to enable email notifications in your Tick-it system.

## Step 1: Domain Setup in Resend Dashboard

1. **Login to Resend.com** and navigate to your dashboard
2. **Go to "Domains"** in the sidebar menu
3. **Click "Add Domain"**
4. **Enter your custom domain** (e.g., `yourdomain.com`)
5. **Choose DNS verification method**

## Step 2: DNS Configuration

Resend will provide you with specific DNS records. Add these to your domain registrar's DNS settings:

### Required DNS Records:

**SPF Record (TXT)**:
```
Name: @
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

**DKIM Record (TXT)**:
```
Name: resend._domainkey
Type: TXT
Value: [Unique value provided by Resend - copy exactly]
TTL: 3600
```

**DMARC Record (TXT)** (Optional but recommended):
```
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

> **Note**: DNS propagation can take up to 24-48 hours, but usually completes within 1-2 hours.

## Step 3: Get Your Resend API Key

1. In Resend dashboard, go to **"API Keys"**
2. **Create a new API key** or use an existing one
3. **Copy the API key** - you'll need this for Supabase configuration
4. **Store it securely** - you won't be able to see it again

## Step 4: Configure Supabase Environment Variables

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **Edge Functions**
3. **Add/Update environment variable**:
   - **Key**: `RESEND_API_KEY`
   - **Value**: Your Resend API key from Step 3

## Step 5: Update the Edge Function

You need to update the `from` field in your Edge function. Currently it uses:
```typescript
from: 'onboarding@resend.dev'
```

**Change it to use your custom domain**:
```typescript
from: 'notifications@yourdomain.com'
// or
from: 'tickit@yourdomain.com'
// or any email address using your verified domain
```

### Complete Code Change Required:

In `supabase/functions/notify-category-admins/index.ts`, line 82, change:

**FROM:**
```typescript
body: JSON.stringify({
  from: 'onboarding@resend.dev',
  to: admin.email,
  subject: emailData.subject,
  html: emailData.html
})
```

**TO:**
```typescript
body: JSON.stringify({
  from: 'notifications@yourdomain.com', // Replace with your domain
  to: admin.email,
  subject: emailData.subject,
  html: emailData.html
})
```

## Step 6: Verify Domain in Resend

1. After adding DNS records, return to Resend dashboard
2. **Click "Verify Domain"** next to your domain
3. **Wait for verification** (green checkmark should appear)
4. **Domain status should show "Verified"**

## Step 7: Test Email Functionality

1. **Deploy your updated Edge function** to Supabase
2. **Create a test ticket** in your Tick-it system
3. **Check that emails are sent** from your custom domain
4. **Verify delivery** in recipient inboxes

## Step 8: Monitor Email Delivery

1. In Resend dashboard, go to **"Logs"**
2. **Monitor email delivery status**
3. **Check for any bounces or failures**
4. **Review delivery analytics**

## Troubleshooting

### Common Issues:

**DNS Not Propagated:**
- Wait 24-48 hours for full propagation
- Use DNS checker tools to verify records

**Domain Not Verified:**
- Double-check DNS records match exactly
- Ensure no extra spaces or characters
- Contact your domain registrar if needed

**Emails Not Sending:**
- Verify RESEND_API_KEY is set correctly in Supabase
- Check Edge function logs for errors
- Ensure domain is fully verified in Resend

**Emails Going to Spam:**
- Add DMARC record
- Warm up your domain by sending gradually increasing volumes
- Monitor sender reputation

## Best Practices

1. **Use a subdomain** like `mail.yourdomain.com` for email sending
2. **Set up DMARC policy** for better deliverability
3. **Monitor bounce rates** and maintain good sender reputation
4. **Use descriptive sender names** like "Tick-it Notifications"
5. **Include unsubscribe links** if sending marketing emails

## Email Template Customization

You can also customize the email template in the Edge function to match your branding:

```typescript
html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">New Ticket Created</h2>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
      <p><strong>Category:</strong> ${ticketData.category}</p>
      <p><strong>Title:</strong> ${ticketData.title}</p>
      <p><strong>Description:</strong> ${ticketData.description}</p>
      <p><strong>Requester:</strong> ${ticketData.requester_name}</p>
      <p><strong>Date Created:</strong> ${new Date(ticketData.date_created).toLocaleString()}</p>
    </div>
    <br>
    <p>Please review and assign this ticket as needed.</p>
    <p><a href="https://www.tick-it.space/admin" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Admin Dashboard</a></p>
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">This is an automated notification from Tick-it System</p>
  </div>
`
```

## Security Considerations

1. **Keep API keys secure** - never commit them to version control
2. **Use environment variables** for all sensitive data
3. **Regularly rotate API keys**
4. **Monitor for unauthorized usage**
5. **Set up rate limiting** if needed

---

Once you complete these steps, your Tick-it system will send professional email notifications from your custom domain!