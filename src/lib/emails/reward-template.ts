/**
 * Reward Email Template
 * 
 * Email sent to valid users containing their promotion code
 * and detailed instructions for redemption.
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getRewardEmailTemplate(promoCode: string): EmailTemplate {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowcrest.app';

  const subject = '🎉 Thank you! Here\'s your reward';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Survey Reward</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Thank You! 🎉
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 15px 0 0 0; font-size: 16px;">
                Your survey response has been verified
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We truly appreciate you taking the time to complete our survey. As a thank you, we're giving you <strong>€2.90 off any subscription</strong> — that's <strong>1 month free</strong> on monthly plans, or €2.90 off yearly!
              </p>
              
              <!-- Promo Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #f6f8fc 0%, #eef1f8 100%); border: 2px dashed #667eea; border-radius: 10px; padding: 25px; display: inline-block;">
                      <p style="color: #666; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                        Your Promo Code
                      </p>
                      <p style="color: #667eea; font-size: 28px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 2px;">
                        ${promoCode}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <h3 style="color: #333; font-size: 18px; margin: 30px 0 15px 0;">
                How to redeem your reward:
              </h3>
              <ol style="color: #555; font-size: 15px; line-height: 2.0; padding-left: 20px; margin: 0;">
                <li><strong>Visit</strong> <a href="${appUrl}" style="color: #667eea; text-decoration: none;">flowcrest.app</a></li>
                <li><strong>Register</strong> for a free account (or log in if you already have one)</li>
                <li>Go to <strong>Pricing</strong> page</li>
                <li><strong>Choose your plan</strong> — Monthly or Yearly subscription</li>
                <li>On the <strong>Stripe checkout page</strong>, click "Add promotion code"</li>
                <li>Enter your code: <strong style="color: #667eea; font-family: monospace;">${promoCode}</strong></li>
                <li>Complete your purchase and enjoy! 🚀</li>
              </ol>
              
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #065f46; font-size: 14px; margin: 0;">
                  <strong>💡 Tip:</strong> This code gives you €2.90 off, which means your first month is completely free on any monthly plan!
                </p>
              </div>
              
              <p style="color: #888; font-size: 14px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
                This code is valid for one-time use only and cannot be combined with other offers.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 13px; margin: 0;">
                Questions? <a href="https://www.flowcrest.app/nodeprompter/help/help.html" style="color: #667eea; text-decoration: none;">Contact our support team</a> (scroll to Support section).
              </p>
              <p style="color: #aaa; font-size: 12px; margin: 10px 0 0 0;">
                Flowcrest Team
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Thank You! 🎉

Your survey response has been verified.

We truly appreciate you taking the time to complete our survey. As a thank you, we're giving you €2.90 off any subscription — that's 1 month free on monthly plans, or €2.90 off yearly!

YOUR PROMO CODE: ${promoCode}

How to redeem your reward:

1. Visit flowcrest.app
2. Register for a free account (or log in if you already have one)
3. Go to Pricing page
4. Choose your plan — Monthly or Yearly subscription
5. On the Stripe checkout page, click "Add promotion code"
6. Enter your code: ${promoCode}
7. Complete your purchase and enjoy! 🚀

💡 Tip: This code gives you €2.90 off, which means your first month is completely free on any monthly plan!

This code is valid for one-time use only and cannot be combined with other offers.

Questions? Contact our support team:
https://www.flowcrest.app/nodeprompter/help/help.html
(Scroll down to the Support section)

Flowcrest Team
  `.trim();

  return { subject, html, text };
}
