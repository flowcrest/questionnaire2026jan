/**
 * Tally Webhook Endpoint
 * 
 * Receives survey submissions from Tally, validates them,
 * and routes them to the appropriate handler:
 * - Valid: Insert into Supabase (triggers reward flow)
 * - Duplicate: Silent drop (already rewarded)
 * - Attention fail: Send abuse email
 * 
 * Note: Bot detection is handled by Tally's built-in CAPTCHA
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
    console.log('========================================');
    console.log('Received Tally webhook');
    console.log('========================================');

    try {
        // 1. Parse payload
        const payload: TallyWebhookPayload = await request.json();

        // DEBUG: Log the complete raw payload from Tally
        console.log('\n======= RAW TALLY PAYLOAD =======');
        console.log(JSON.stringify(payload, null, 2));
        console.log('=================================\n');

        // DEBUG: Log each field individually for better visibility
        console.log('\n======= INDIVIDUAL FIELDS =======');
        payload.data.fields.forEach((field, index) => {
            console.log(`\n--- Field ${index + 1} ---`);
            console.log('Key:', field.key);
            console.log('Label:', field.label);
            console.log('Type:', field.type);
            console.log('Value:', JSON.stringify(field.value, null, 2));
            console.log('Value type:', typeof field.value);
            if (Array.isArray(field.value)) {
                console.log('Value is array with', field.value.length, 'items');
                field.value.forEach((item, i) => {
                    console.log(`  Item ${i}:`, JSON.stringify(item, null, 2));
                });
            }
        });
        console.log('=================================\n');

        console.log('Processing submission:', payload.data.responseId);

        // 2. Transform to internal format
        const submission = transformTallyPayload(payload);

        // DEBUG: Log transformed submission
        console.log('\n======= TRANSFORMED SUBMISSION =======');
        console.log(JSON.stringify(submission, null, 2));
        console.log('======================================\n');

        // 3. Extract email
        const email = extractEmail(submission.fields);
        if (!email) {
            console.error('No email found in submission');
            return NextResponse.json(
                { error: 'No email found' },
                { status: 400 }
            );
        }

        // DEBUG: Log the answers that will be saved
        const answersToSave = fieldsToAnswers(submission.fields);
        console.log('\n======= ANSWERS TO SAVE IN SUPABASE =======');
        console.log(JSON.stringify(answersToSave, null, 2));
        console.log('===========================================\n');

        // 4. Run validation (attention-check + duplicate detection only)
        const validationResult = await validateSubmission(submission);
        console.log('Validation result:', validationResult);

        // 5. Handle based on classification
        switch (validationResult.classification) {
            case 'valid':
                // Insert into database - this will trigger Supabase webhook for reward
                await insertSubmission({
                    email,
                    tally_response_id: submission.responseId,
                    answers: fieldsToAnswers(submission.fields),
                    classification: 'valid',
                    classification_reason: validationResult.reason,
                });
                console.log('Valid submission stored:', submission.responseId);
                break;

            case 'duplicate':
                // Silent drop - user already received reward
                console.log('Duplicate submission ignored:', submission.responseId, email);
                break;

            case 'attention_fail':
                // Store for records, then send abuse email
                await insertSubmission({
                    email,
                    tally_response_id: submission.responseId,
                    answers: fieldsToAnswers(submission.fields),
                    classification: 'attention_fail',
                    classification_reason: validationResult.reason,
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

        // Always return success to Tally
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
