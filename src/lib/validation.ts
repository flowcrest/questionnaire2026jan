/**
 * Validation Engine
 * 
 * Processes incoming survey data and determines validity:
 * - Attention-check: Decoy questions that must be answered correctly
 * - Duplicate detection: Same email submitted multiple times
 * 
 * Note: Bot detection is handled by Tally's built-in CAPTCHA
 */

import { checkDuplicateEmail } from './supabase';

// Attention check question identifier (appears in all branches)
const ATTENTION_CHECK_LABEL_PATTERN = 'have you been paying attention';
const ATTENTION_CHECK_CORRECT_ANSWER = 'Yes';

export type ClassificationResult = {
    classification: 'valid' | 'attention_fail' | 'duplicate';
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
 * Extract email from Tally submission fields
 */
export function extractEmail(fields: TallyAnswer[]): string | null {
    const emailField = fields.find(
        f => f.field.type === 'INPUT_EMAIL' ||
            (f.field.id && f.field.id.toLowerCase().includes('email')) ||
            (f.field.title && f.field.title.toLowerCase().includes('email'))
    );

    if (emailField && typeof emailField.value === 'string') {
        return emailField.value.toLowerCase().trim();
    }

    return null;
}

/**
 * Check if attention check question was answered correctly
 * The question appears in multiple branches with the same text:
 * "In the world of AI, we get results in a blink of an eye. This might undermine our attention spans. Have you been paying attention?"
 * The correct answer is "Yes"
 */
function checkAttentionAnswer(fields: TallyAnswer[]): boolean {
    // Find attention check field(s) by label - there might be multiple (one per branch)
    // We only need to check the one that was actually answered (value is not null)
    const attentionField = fields.find(
        f => f.field.title &&
            f.field.title.toLowerCase().includes(ATTENTION_CHECK_LABEL_PATTERN) &&
            f.value !== null && f.value !== undefined
    );

    if (!attentionField) {
        // No answered attention check field found - this shouldn't happen
        // but if it does, log it and consider it failed
        console.warn('No answered attention check field found');
        return false;
    }

    // Handle different value types from Tally (usually array of UUIDs for MULTIPLE_CHOICE)
    let answer: string;
    if (typeof attentionField.value === 'string') {
        answer = attentionField.value;
    } else if (Array.isArray(attentionField.value)) {
        // For multiple choice, we get UUID(s) - we need to look up the text
        // But at this point we only have the internal format without options
        // So we'll just use the UUID as-is and compare
        answer = attentionField.value[0]?.toString() || '';
    } else {
        answer = String(attentionField.value);
    }

    console.log('Attention check - Field title:', attentionField.field.title);
    console.log('Attention check - Raw answer:', answer);

    // Check if answer matches "Yes"
    // Since we receive UUID, we need to check if the text contains "Yes" when resolved
    // However, at validation stage we only have UUID - so we need a different approach
    // Let's check the UUID against known "Yes" option IDs from the logs:
    // Branch 1: "d52b3b5d-e0cd-454c-afa3-15276ea5b2ef" = "Yes"
    // Branch 2: "ec4062ef-8d35-40f9-8afc-0bb67d41b086" = "Yes"  
    // Branch 3: "875f4d5a-728d-40ce-91ef-ac72f9067627" = "Yes"
    // Branch 4: "8d7272ab-3489-48fe-bc74-63573d026123" = "Yes"

    const yesOptionIds = [
        'd52b3b5d-e0cd-454c-afa3-15276ea5b2ef', // Branch 1
        'ec4062ef-8d35-40f9-8afc-0bb67d41b086', // Branch 2
        '875f4d5a-728d-40ce-91ef-ac72f9067627', // Branch 3
        '8d7272ab-3489-48fe-bc74-63573d026123', // Branch 4
    ];

    const isCorrect = yesOptionIds.includes(answer);
    console.log('Attention check - Is correct:', isCorrect);

    return isCorrect;
}

/**
 * Main validation function - classifies a submission
 */
export async function validateSubmission(
    submission: TallySubmission
): Promise<ClassificationResult> {
    const { fields } = submission;

    // 1. Check for duplicate email
    const email = extractEmail(fields);
    if (email) {
        const isDuplicate = await checkDuplicateEmail(email);
        if (isDuplicate) {
            return {
                classification: 'duplicate',
                reason: 'Duplicate email submission detected',
            };
        }
    }

    // 2. Check attention question (human abuse detection)
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
