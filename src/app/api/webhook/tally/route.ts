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
import { validateSubmission, extractEmail, TallySubmission } from '@/lib/validation';
import { insertSubmission } from '@/lib/supabase';
import { sendAbuseEmail } from '@/lib/mailgun';

// Tally webhook payload structure - includes options for multiple choice
interface TallyFieldOption {
    id: string;
    text: string;
    isOtherOption?: boolean;
    optionId?: string;
}

interface TallyField {
    key: string;
    label: string;
    type: string;
    value: unknown;
    options?: TallyFieldOption[];
}

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
        fields: TallyField[];
    };
}

/**
 * Resolve option IDs to text values for MULTIPLE_CHOICE fields
 */
function resolveOptionValue(field: TallyField): string | string[] | null {
    // If value is null, return null
    if (field.value === null || field.value === undefined) {
        return null;
    }

    // If not a MULTIPLE_CHOICE or no options, return value as-is
    if (field.type !== 'MULTIPLE_CHOICE' || !field.options) {
        return field.value as string;
    }

    // Value is an array of option IDs - resolve to text
    if (Array.isArray(field.value)) {
        const resolvedValues = field.value.map(optionId => {
            const option = field.options!.find(opt => opt.id === optionId);
            return option ? option.text : optionId; // Fallback to ID if not found
        });
        // If single selection, return as string; otherwise as array
        return resolvedValues.length === 1 ? resolvedValues[0] : resolvedValues;
    }

    return field.value as string;
}

/**
 * Convert Tally fields to a readable format for storage
 * Preserves order by using index, resolves option IDs to text
 */
function tallyFieldsToAnswers(fields: TallyField[]): Record<string, unknown> {
    const answers: Record<string, unknown> = {};

    fields.forEach((field, index) => {
        const resolvedValue = resolveOptionValue(field);

        answers[field.key] = {
            index: index, // Preserve order
            title: field.label,
            type: field.type,
            value: resolvedValue,
            // Also store raw value for debugging if needed
            rawValue: field.value,
        };
    });

    return answers;
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
    console.log('[Tally Webhook] Received request');

    try {
        // 1. Parse payload
        const payload: TallyWebhookPayload = await request.json();
        console.log('[Tally Webhook] Processing submission:', payload.data.responseId, 'from form:', payload.data.formName);

        // 2. Transform to internal format
        const submission = transformTallyPayload(payload);

        // 3. Extract email
        const email = extractEmail(submission.fields);
        console.log('[Tally Webhook] Email extracted:', email);

        if (!email) {
            console.error('[Tally Webhook] ERROR: No email found in submission');
            return NextResponse.json(
                { error: 'No email found' },
                { status: 400 }
            );
        }

        // 4. Prepare answers with resolved option values
        const answersToSave = tallyFieldsToAnswers(payload.data.fields);

        // 5. Run validation (attention-check + duplicate detection)
        console.log('[Tally Webhook] Running validation...');
        const validationResult = await validateSubmission(submission);
        console.log('[Tally Webhook] Validation result:', validationResult.classification, '-', validationResult.reason);

        // 6. Handle based on classification
        switch (validationResult.classification) {
            case 'valid':
                console.log('[Tally Webhook] Inserting VALID submission to Supabase...');
                try {
                    const insertedRecord = await insertSubmission({
                        email,
                        tally_response_id: submission.responseId,
                        answers: answersToSave,
                        classification: 'valid',
                        classification_reason: validationResult.reason,
                    });
                    console.log('[Tally Webhook] SUCCESS: Valid submission stored with ID:', insertedRecord?.id);
                } catch (insertError) {
                    console.error('[Tally Webhook] ERROR inserting to Supabase:', insertError);
                    throw insertError;
                }
                break;

            case 'duplicate':
                console.log('[Tally Webhook] DUPLICATE: Submission ignored for', email);
                break;

            case 'attention_fail':
                console.log('[Tally Webhook] ATTENTION FAIL: Storing submission and sending abuse email...');
                try {
                    const insertedRecord = await insertSubmission({
                        email,
                        tally_response_id: submission.responseId,
                        answers: answersToSave,
                        classification: 'attention_fail',
                        classification_reason: validationResult.reason,
                    });
                    console.log('[Tally Webhook] Attention fail submission stored with ID:', insertedRecord?.id);

                    // Send abuse notification email
                    console.log('[Tally Webhook] Sending abuse email to:', email);
                    const emailResult = await sendAbuseEmail(email);
                    if (emailResult.success) {
                        console.log('[Tally Webhook] SUCCESS: Abuse email sent to:', email);
                    } else {
                        console.error('[Tally Webhook] ERROR: Failed to send abuse email:', emailResult.error);
                    }
                } catch (insertError) {
                    console.error('[Tally Webhook] ERROR handling attention fail:', insertError);
                    throw insertError;
                }
                break;
        }

        // Always return success to Tally
        console.log('[Tally Webhook] Request completed successfully');
        return NextResponse.json({
            success: true,
            classification: validationResult.classification,
        });

    } catch (error) {
        console.error('[Tally Webhook] FATAL ERROR:', error);
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
