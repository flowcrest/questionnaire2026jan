/**
 * Validation Engine
 * 
 * Processes incoming survey data and determines validity through multi-criteria analysis:
 * - Bot detection: Fast submissions, honeypot fields
 * - Attention-check: Decoy questions that must be answered correctly
 * - Duplicate detection: Same email submitted multiple times
 */

import { checkDuplicateEmail } from './supabase';

// Configuration
const MIN_SUBMISSION_TIME_SECONDS = 10; // Submissions faster than this are likely bots
const ATTENTION_CHECK_FIELD_ID = 'attention_check'; // Field ID in Tally form
const ATTENTION_CHECK_CORRECT_ANSWER = '1'; // Expected answer: "If you read this, select option 1"
const HONEYPOT_FIELD_ID = 'honeypot'; // Hidden field that should remain empty

export type ClassificationResult = {
    classification: 'valid' | 'bot' | 'attention_fail';
    reason: string;
};

export interface TallyAnswer {
    field: {
        id: string;
        title: string;
        type: string;
    };
    value: unknown;
}

export interface TallySubmission {
    responseId: string;
    respondentId?: string;
    submittedAt: string;
    createdAt: string;
    fields: TallyAnswer[];
}

/**
 * Calculate submission time in seconds (time from form load to submit)
 */
function calculateSubmissionTime(createdAt: string, submittedAt: string): number {
    const created = new Date(createdAt).getTime();
    const submitted = new Date(submittedAt).getTime();
    return (submitted - created) / 1000;
}

/**
 * Extract email from Tally submission fields
 */
export function extractEmail(fields: TallyAnswer[]): string | null {
    const emailField = fields.find(
        f => f.field.type === 'INPUT_EMAIL' ||
            f.field.id.toLowerCase().includes('email') ||
            f.field.title.toLowerCase().includes('email')
    );

    if (emailField && typeof emailField.value === 'string') {
        return emailField.value.toLowerCase().trim();
    }

    return null;
}

/**
 * Check if honeypot field was filled (indicates bot)
 */
function checkHoneypot(fields: TallyAnswer[]): boolean {
    const honeypotField = fields.find(f => f.field.id === HONEYPOT_FIELD_ID);

    if (honeypotField && honeypotField.value) {
        // Honeypot should be empty - if it has a value, it's likely a bot
        return true;
    }

    return false;
}

/**
 * Check if attention check question was answered correctly
 */
function checkAttentionAnswer(fields: TallyAnswer[]): boolean {
    const attentionField = fields.find(
        f => f.field.id === ATTENTION_CHECK_FIELD_ID ||
            f.field.title.toLowerCase().includes('if you read this')
    );

    if (!attentionField) {
        // No attention check field found - consider it passed
        return true;
    }

    // Handle different value types from Tally
    let answer: string;
    if (typeof attentionField.value === 'string') {
        answer = attentionField.value;
    } else if (Array.isArray(attentionField.value)) {
        answer = attentionField.value[0]?.toString() || '';
    } else if (typeof attentionField.value === 'object' && attentionField.value !== null) {
        answer = (attentionField.value as { id?: string }).id || '';
    } else {
        answer = String(attentionField.value);
    }

    // Check if answer matches expected value (option 1)
    return answer === ATTENTION_CHECK_CORRECT_ANSWER ||
        answer.includes('1') ||
        answer.toLowerCase().includes('option 1');
}

/**
 * Main validation function - classifies a submission
 */
export async function validateSubmission(
    submission: TallySubmission
): Promise<ClassificationResult> {
    const { fields, createdAt, submittedAt } = submission;

    // 1. Check honeypot (bot detection)
    if (checkHoneypot(fields)) {
        return {
            classification: 'bot',
            reason: 'Honeypot field was filled',
        };
    }

    // 2. Check submission timing (bot detection)
    const submissionTime = calculateSubmissionTime(createdAt, submittedAt);
    if (submissionTime < MIN_SUBMISSION_TIME_SECONDS) {
        return {
            classification: 'bot',
            reason: `Submission too fast: ${submissionTime.toFixed(1)} seconds`,
        };
    }

    // 3. Check for duplicate email
    const email = extractEmail(fields);
    if (email) {
        const isDuplicate = await checkDuplicateEmail(email);
        if (isDuplicate) {
            return {
                classification: 'bot',
                reason: 'Duplicate email submission detected',
            };
        }
    }

    // 4. Check attention question (human abuse detection)
    if (!checkAttentionAnswer(fields)) {
        return {
            classification: 'attention_fail',
            reason: 'Failed attention check question',
        };
    }

    // All checks passed
    return {
        classification: 'valid',
        reason: 'All validation checks passed',
    };
}

/**
 * Convert Tally fields to a simple key-value object for storage
 */
export function fieldsToAnswers(fields: TallyAnswer[]): Record<string, unknown> {
    const answers: Record<string, unknown> = {};

    for (const field of fields) {
        answers[field.field.id] = {
            title: field.field.title,
            type: field.field.type,
            value: field.value,
        };
    }

    return answers;
}
