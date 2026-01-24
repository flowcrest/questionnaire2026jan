/**
 * Supabase Webhook Endpoint
 * 
 * Triggered when a new valid submission is inserted into the database.
 * Creates a Stripe promo code and sends the reward email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPromoCode } from '@/lib/stripe';
import { sendRewardEmail } from '@/lib/mailgun';
import { updateSubmissionWithReward, getSubmissionById } from '@/lib/supabase';

// Supabase webhook payload structure for INSERT events
interface SupabaseWebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    record: {
        id: string;
        email: string;
        classification: 'valid' | 'bot' | 'attention_fail';
        promo_code?: string;
        email_sent?: boolean;
    };
    old_record?: unknown;
}

export async function POST(request: NextRequest) {
    console.log('Received Supabase webhook');

    try {
        // 1. Parse payload
        const payload: SupabaseWebhookPayload = await request.json();
        console.log('Supabase event:', payload.type, 'for table:', payload.table);

        // 2. Only process INSERT events on submissions table
        if (payload.type !== 'INSERT' || payload.table !== 'submissions') {
            return NextResponse.json({
                success: true,
                message: 'Event ignored',
            });
        }

        const { record } = payload;

        // 3. Only process valid submissions
        if (record.classification !== 'valid') {
            console.log('Ignoring non-valid submission:', record.id);
            return NextResponse.json({
                success: true,
                message: 'Non-valid submission ignored',
            });
        }

        // 4. Skip if reward already sent
        if (record.promo_code || record.email_sent) {
            console.log('Reward already processed for:', record.id);
            return NextResponse.json({
                success: true,
                message: 'Already processed',
            });
        }

        // 5. Create Stripe promo code
        console.log('Creating promo code for:', record.email);
        const promoCode = await createPromoCode(record.email);

        // 6. Send reward email
        console.log('Sending reward email to:', record.email);
        const emailResult = await sendRewardEmail(record.email, promoCode);

        if (!emailResult.success) {
            console.error('Failed to send reward email:', emailResult.error);
            // Still update the record with promo code even if email fails
            // This can be retried manually
        }

        // 7. Update submission record
        await updateSubmissionWithReward(record.id, promoCode);

        console.log('Reward flow completed for:', record.email, 'with code:', promoCode);

        return NextResponse.json({
            success: true,
            promoCode,
            emailSent: emailResult.success,
        });

    } catch (error) {
        console.error('Error processing Supabase webhook:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle health checks
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        endpoint: 'supabase-webhook',
        timestamp: new Date().toISOString(),
    });
}
