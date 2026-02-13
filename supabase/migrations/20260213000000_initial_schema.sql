-- ============================================================
-- [ REDACTED ] — Initial Schema Migration
-- ============================================================

-- Status enum type
DO $$ BEGIN
    CREATE TYPE word_status AS ENUM (
        'pending',
        'visible',
        'flagged',
        'redacted',
        'admin_removed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Position sequence — single source of truth for story order
CREATE SEQUENCE IF NOT EXISTS words_position_seq;

-- Primary table: each word is a discrete record
CREATE TABLE IF NOT EXISTS words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    position INTEGER UNIQUE DEFAULT NULL,
    content VARCHAR(20) NOT NULL,
    flag_count INTEGER NOT NULL DEFAULT 0 CHECK (
        flag_count >= 0
        AND flag_count <= 20
    ),
    status word_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_fingerprint TEXT
);

-- Index for fetching story in order (the hot path)
CREATE INDEX IF NOT EXISTS idx_words_position ON words (position ASC)
WHERE
    position IS NOT NULL;

-- Index for status filtering (pending words excluded from story)
CREATE INDEX IF NOT EXISTS idx_words_status ON words (status);

-- Index for looking up words by payment intent (webhook processing)
CREATE INDEX IF NOT EXISTS idx_words_payment_intent ON words (stripe_payment_intent_id)
WHERE
    stripe_payment_intent_id IS NOT NULL;

-- Flag deduplication table
CREATE TABLE IF NOT EXISTS word_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    word_id UUID NOT NULL REFERENCES words (id) ON DELETE CASCADE,
    session_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (word_id, session_fingerprint)
);

-- Index for checking total flags per fingerprint (rate limiting)
CREATE INDEX IF NOT EXISTS idx_word_flags_fingerprint ON word_flags (session_fingerprint);

-- Checkout tracking table (maps PaymentIntents to cart actions)
CREATE TABLE IF NOT EXISTS checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'processing',
            'completed',
            'failed'
        )
    ),
    cart_actions JSONB NOT NULL,
    results JSONB,
    total_amount NUMERIC(10, 2) NOT NULL,
    refund_amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for checkouts
CREATE INDEX IF NOT EXISTS idx_checkouts_payment_intent ON checkouts (stripe_payment_intent_id);