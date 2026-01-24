/**
 * Tally Webhook Endpoint
 * 
 * Receives survey submissions from Tally, validates them,
 * and routes them to the appropriate handler:
 * - Valid: Insert into Supabase (triggers reward flow)
 * - Bot: Silent drop, no action
 * - Attention fail: Send abuse email, then drop
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSubmission, extractEmail, fieldsToAnswers, TallySubmission } from '@/lib/validation';
import { insertSubmission } from '@/lib/supabase';
import { sendAbuseEmail } from '@/lib/mailgun';

// Tally webhook payload structure
interface TallyWebhookPayload {
    eventId: string;
    eventType: 'FORM_RESPONSE';
    createdAt: string;
    data: {
        responseId: string;
        respondentId?: string;
        formId: string;
        formName: string;
        createdAt: string;
        fields: Array<{
            key: string;
            label: string;
            type: string;
            value: unknown;
        }>;
    };
}

/**
 * Verify Tally webhook signature (if configured)
 */
function verifyWebhookSignature(request: NextRequest): boolean {
    const secret = process.env.TALLY_WEBHOOK_SECRET;

    // If no secret configured, skip verification (development mode)
    if (!secret) {
        console.warn('TALLY_WEBHOOK_SECRET not configured - skipping signature verification');
        return true;
    }

    // Tally doesn't currently provide webhook signatures
    // This is a placeholder for future implementation
    // You could add custom header verification here
    return true;
}

/**
 * Transform Tally payload to internal format
 */
function transformTallyPayload(payload: TallyWebhookPayload): TallySubmission {
    const { data } = payload;

    return {
        responseId: data.responseId,
        respondentId: data.respondentId,
        submittedAt: payload.createdAt,
        createdAt: data.createdAt,
        fields: data.fields.map(field => ({
            field: {
                id: field.key,
                title: field.label,
                type: field.type,
            },
            value: field.value,
        })),
    };
}

export async function POST(request: NextRequest) {
    console.log('Received Tally webhook');

    try {
        // 1. Verify webhook signature
        if (!verifyWebhookSignature(request)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // 2. Parse payload
        const payload: TallyWebhookPayload = await request.json();
        console.log('Processing submission:', payload.data.responseId);

        // 3. Transform to internal format
        const submission = transformTallyPayload(payload);

        // 4. Extract email
        const email = extractEmail(submission.fields);
        if (!email) {
            console.error('No email found in submission');
            return NextResponse.json(
                { error: 'No email found' },
                { status: 400 }
            );
        }

        // 5. Run validation
        const validationResult = await validateSubmission(submission);
        console.log('Validation result:', validationResult);

        // 6. Calculate submission time
        const submissionTimeSeconds =
            (new Date(submission.submittedAt).getTime() - new Date(submission.createdAt).getTime()) / 1000;

        // 7. Handle based on classification
        switch (validationResult.classification) {
            case 'valid':
                // Insert into database - this will trigger Supabase webhook
                await insertSubmission({
                    email,
                    tally_response_id: submission.responseId,
                    answers: fieldsToAnswers(submission.fields),
                    classification: 'valid',
                    classification_reason: validationResult.reason,
                    submission_time_seconds: submissionTimeSeconds,
                });
                console.log('Valid submission stored:', submission.responseId);
                break;

            case 'bot':
                // Silent drop - no action, no email
                // Optionally log for monitoring
                console.log('Bot submission dropped:', submission.responseId, validationResult.reason);
                break;

            case 'attention_fail':
                // Store for records, then send abuse email
                const failedSubmission = await insertSubmission({
                    email,
                    tally_response_id: submission.responseId,
                    answers: fieldsToAnswers(submission.fields),
                    classification: 'attention_fail',
                    classification_reason: validationResult.reason,
                    submission_time_seconds: submissionTimeSeconds,
                });

                // Send abuse notification email
                const emailResult = await sendAbuseEmail(email);
                if (emailResult.success) {
                    console.log('Abuse email sent to:', email);
                } else {
                    console.error('Failed to send abuse email:', emailResult.error);
                }
                break;
        }

        // Always return success to Tally (they don't need validation details)
        return NextResponse.json({
            success: true,
            classification: validationResult.classification,
        });

    } catch (error) {
        console.error('Error processing Tally webhook:', error);
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
        endpoint: 'tally-webhook',
        timestamp: new Date().toISOString(),
    });
}
