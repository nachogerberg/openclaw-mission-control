-- Meta Ads Tables for BAMC Mission Control
-- Run this to create the necessary tables for Meta Ads extraction

-- Meta Ads Insights table
CREATE TABLE IF NOT EXISTS meta_ads_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  ad_id text,
  ad_title text,
  ad_body text,
  creative_url text,
  landing_page_url text,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  reach bigint DEFAULT 0,
  cpc numeric(10,4) DEFAULT 0,
  ctr numeric(8,4) DEFAULT 0,
  search_query text,
  meta jsonb DEFAULT '{}'::jsonb,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for meta_ads_insights
CREATE INDEX IF NOT EXISTS idx_meta_ads_insights_account_id ON meta_ads_insights(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_insights_ad_account_id ON meta_ads_insights(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_insights_extracted_at ON meta_ads_insights(extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_insights_search_query ON meta_ads_insights(search_query);

-- Unique constraint for upsert
ALTER TABLE meta_ads_insights ADD CONSTRAINT meta_ads_insights_unique 
  UNIQUE (account_id, ad_account_id, ad_id, extracted_at);

-- Meta Ads Analysis table
CREATE TABLE IF NOT EXISTS meta_ads_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  analysis_date timestamptz NOT NULL DEFAULT now(),
  ads_analyzed int DEFAULT 0,
  alerts_triggered int DEFAULT 0,
  critical_alerts int DEFAULT 0,
  warning_alerts int DEFAULT 0,
  top_performers jsonb DEFAULT '[]'::jsonb,
  alerts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_analysis_account_id ON meta_ads_analysis(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_analysis_date ON meta_ads_analysis(analysis_date DESC);

-- Accounts table (if not exists)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_key text UNIQUE NOT NULL,
    display_name text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Data Quality Log table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS data_quality_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    source text NOT NULL,
    check_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    affected_table text,
    affected_count int,
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_data_quality_log_account_id ON data_quality_log(account_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_log_source ON data_quality_log(source);
CREATE INDEX IF NOT EXISTS idx_data_quality_log_severity ON data_quality_log(severity);
CREATE INDEX IF NOT EXISTS idx_data_quality_log_created_at ON data_quality_log(created_at DESC);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;