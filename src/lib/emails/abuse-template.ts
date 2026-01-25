/**
 * Abuse Notification Email Template
 * 
 * Email sent to users who failed validation checks.
 * Notifies them that the submission could not be verified and no reward will be issued.
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getAbuseEmailTemplate(): EmailTemplate {
  const subject = 'Survey Submission - Verification Notice';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Survey Submission Notice</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">
                Submission Verification Notice
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in completing our survey.
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We use a multi-layered verification system to ensure the authenticity and quality of survey responses. This includes behavioral analysis, response pattern evaluation, and consistency checks across multiple data points.
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Unfortunately, your submission did not pass our verification process. Our system detected inconsistencies that prevented us from validating your response.
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                  As a result, we are unable to issue a reward for this submission.
                </p>
              </div>
              
              <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
                If you believe this was made in error, please <a href="https://www.flowcrest.app/nodeprompter/help/help.html" style="color: #667eea; text-decoration: none;">contact our support team</a> with details about your submission. Scroll down to the Support section and write us a letter.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 13px; margin: 0;">
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
Submission Verification Notice

Thank you for your interest in completing our survey.

We use a multi-layered verification system to ensure the authenticity and quality of survey responses. This includes behavioral analysis, response pattern evaluation, and consistency checks across multiple data points.

Unfortunately, your submission did not pass our verification process. Our system detected inconsistencies that prevented us from validating your response.

As a result, we are unable to issue a reward for this submission.

If you believe this was made in error, please contact our support team at:
https://www.flowcrest.app/nodeprompter/help/help.html
(Scroll down to the Support section and write us a letter)

Flowcrest Team
  `.trim();

  return { subject, html, text };
}
