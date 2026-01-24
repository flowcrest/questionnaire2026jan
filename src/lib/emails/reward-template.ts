/**
 * Reward Email Template
 * 
 * Email sent to valid users containing their promotion code
 * and instructions for redemption.
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
                Your survey response has been received
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We truly appreciate you taking the time to complete our survey. As a thank you, we're giving you a <strong>one-month free subscription</strong>!
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
                How to redeem:
              </h3>
              <ol style="color: #555; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li>Go to <a href="${appUrl}" style="color: #667eea; text-decoration: none;">our website</a></li>
                <li>Sign up for a subscription plan</li>
                <li>Enter code <strong>${promoCode}</strong> at checkout</li>
                <li>Enjoy your free month!</li>
              </ol>
              
              <p style="color: #888; font-size: 14px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
                This code is valid for one-time use only.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 13px; margin: 0;">
                Questions? Reply to this email and we'll help you out.
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

Your survey response has been received.

We truly appreciate you taking the time to complete our survey. As a thank you, we're giving you a one-month free subscription!

YOUR PROMO CODE: ${promoCode}

How to redeem:
1. Go to ${appUrl}
2. Sign up for a subscription plan
3. Enter code ${promoCode} at checkout
4. Enjoy your free month!

This code is valid for one-time use only.

Questions? Reply to this email and we'll help you out.
  `.trim();

    return { subject, html, text };
}
