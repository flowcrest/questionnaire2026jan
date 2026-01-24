import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for database operations
export interface Submission {
    id?: string;
    email: string;
    tally_response_id: string;
    answers: Record<string, unknown>;
    classification: 'valid' | 'bot' | 'attention_fail';
    classification_reason?: string;
    promo_code?: string;
    email_sent?: boolean;
    email_type?: 'reward' | 'abuse' | null;
    submission_time_seconds?: number;
    created_at?: string;
    updated_at?: string;
}

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return _supabase;
}

// Export getter for the client
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabaseClient() as unknown as Record<string, unknown>)[prop as string];
    }
});

/**
 * Insert a new submission into the database
 */
export async function insertSubmission(submission: Omit<Submission, 'id' | 'created_at' | 'updated_at'>): Promise<Submission | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('submissions')
        .insert(submission)
        .select()
        .single();

    if (error) {
        console.error('Error inserting submission:', error);
        throw new Error(`Failed to insert submission: ${error.message}`);
    }

    return data;
}

/**
 * Check if an email has already submitted a survey
 */
export async function checkDuplicateEmail(email: string): Promise<boolean> {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('submissions')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

    if (error) {
        console.error('Error checking duplicate email:', error);
        throw new Error(`Failed to check duplicate email: ${error.message}`);
    }

    return data && data.length > 0;
}

/**
 * Update a submission with promo code and email status
 */
export async function updateSubmissionWithReward(
    submissionId: string,
    promoCode: string
): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
        .from('submissions')
        .update({
            promo_code: promoCode,
            email_sent: true,
            email_type: 'reward'
        })
        .eq('id', submissionId);

    if (error) {
        console.error('Error updating submission with reward:', error);
        throw new Error(`Failed to update submission: ${error.message}`);
    }
}

/**
 * Mark a submission as having received an abuse email
 */
export async function markAbuseEmailSent(submissionId: string): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
        .from('submissions')
        .update({
            email_sent: true,
            email_type: 'abuse'
        })
        .eq('id', submissionId);

    if (error) {
        console.error('Error marking abuse email sent:', error);
        throw new Error(`Failed to mark abuse email sent: ${error.message}`);
    }
}

/**
 * Get a submission by ID
 */
export async function getSubmissionById(id: string): Promise<Submission | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching submission:', error);
        return null;
    }

    return data;
}
