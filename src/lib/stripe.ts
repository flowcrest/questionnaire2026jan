/**
 * Stripe Integration
 * 
 * Generates unique one-time promotion codes for survey rewards.
 * Each code provides a fixed-amount discount equivalent to one monthly subscription.
 */

import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
    if (_stripe) return _stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }

    _stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
    });

    return _stripe;
}

function getCouponId(): string {
    const couponId = process.env.STRIPE_COUPON_ID;
    if (!couponId) {
        throw new Error('Missing STRIPE_COUPON_ID environment variable');
    }
    return couponId;
}

/**
 * Create a unique promotion code for a user
 * 
 * @param email - User's email (used for tracking and uniqueness)
 * @returns The generated promotion code string
 */
export async function createPromoCode(email: string): Promise<string> {
    const stripe = getStripeClient();
    const couponId = getCouponId();

    // Generate a unique code suffix
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codePrefix = 'SURVEY';
    const promoCodeString = `${codePrefix}-${uniqueSuffix}`;

    try {
        const promotionCode = await stripe.promotionCodes.create({
            coupon: couponId,
            code: promoCodeString,
            max_redemptions: 1, // One-time use only
            metadata: {
                email: email,
                source: 'survey_reward',
                created_by: 'survey-automation-system',
            },
        });

        console.log(`Created promo code ${promoCodeString} for ${email}`);
        return promotionCode.code;
    } catch (error) {
        console.error('Error creating Stripe promo code:', error);

        // If code collision, try again with different suffix
        if (error instanceof Stripe.errors.StripeInvalidRequestError) {
            const retrySuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
            const retryCode = `${codePrefix}-${retrySuffix}`;

            const promotionCode = await stripe.promotionCodes.create({
                coupon: couponId,
                code: retryCode,
                max_redemptions: 1,
                metadata: {
                    email: email,
                    source: 'survey_reward',
                    created_by: 'survey-automation-system',
                },
            });

            return promotionCode.code;
        }

        throw error;
    }
}

/**
 * Verify that a coupon exists and is valid
 */
export async function verifyCouponExists(): Promise<boolean> {
    try {
        const stripe = getStripeClient();
        const couponId = getCouponId();
        const coupon = await stripe.coupons.retrieve(couponId);
        return coupon.valid;
    } catch (error) {
        console.error('Error verifying coupon:', error);
        return false;
    }
}
