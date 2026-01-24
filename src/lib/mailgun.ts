/**
 * Mailgun Integration
 * 
 * Sends transactional emails for:
 * - Reward emails with promotion codes
 * - Abuse notification emails
 */

import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { getRewardEmailTemplate } from './emails/reward-template';
import { getAbuseEmailTemplate } from './emails/abuse-template';

// Lazy initialization to avoid build-time errors
let _mailgunClient: ReturnType<Mailgun['client']> | null = null;

function getMailgunClient() {
    if (_mailgunClient) return _mailgunClient;

    const apiKey = process.env.MAILGUN_API_KEY;
    if (!apiKey) {
        throw new Error('Missing MAILGUN_API_KEY environment variable');
    }

    const mailgun = new Mailgun(FormData);
    _mailgunClient = mailgun.client({
        username: 'api',
        key: apiKey,
    });

    return _mailgunClient;
}

function getDomain(): string {
    const domain = process.env.MAILGUN_DOMAIN;
    if (!domain) {
        throw new Error('Missing MAILGUN_DOMAIN environment variable');
    }
    return domain;
}

function getFromEmail(): string {
    const domain = getDomain();
    return process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
}

interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send reward email with promotion code to valid user
 */
export async function sendRewardEmail(
    email: string,
    promoCode: string
): Promise<EmailResult> {
    const { subject, html, text } = getRewardEmailTemplate(promoCode);
    const mg = getMailgunClient();
    const domain = getDomain();
    const fromEmail = getFromEmail();

    try {
        const result = await mg.messages.create(domain, {
            from: fromEmail,
            to: [email],
            subject: subject,
            html: html,
            text: text,
        });

        console.log(`Reward email sent to ${email}, messageId: ${result.id}`);

        return {
            success: true,
            messageId: result.id,
        };
    } catch (error) {
        console.error('Error sending reward email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send abuse notification email to user who failed attention check
 */
export async function sendAbuseEmail(email: string): Promise<EmailResult> {
    const { subject, html, text } = getAbuseEmailTemplate();
    const mg = getMailgunClient();
    const domain = getDomain();
    const fromEmail = getFromEmail();

    try {
        const result = await mg.messages.create(domain, {
            from: fromEmail,
            to: [email],
            subject: subject,
            html: html,
            text: text,
        });

        console.log(`Abuse notification sent to ${email}, messageId: ${result.id}`);

        return {
            success: true,
            messageId: result.id,
        };
    } catch (error) {
        console.error('Error sending abuse email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
