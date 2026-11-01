-- =========================================================================
-- RefactAI Database Schema for Supabase
-- Tables: inquiries, analysis_requests
-- =========================================================================

-- 1. Inquiries & Enterprise Consultation Requests Table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    inquiry_type TEXT DEFAULT 'Enterprise Debt Audit',
    repo_url TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching inquiries by email or created_at
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- 2. Repository Analysis History & Audit Runs Table
CREATE TABLE IF NOT EXISTS public.analysis_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    overall_debt_score NUMERIC(5,2) NOT NULL,
    health_status TEXT NOT NULL,
    total_files INT NOT NULL,
    critical_risk_files INT DEFAULT 0,
    avg_complexity NUMERIC(5,2) DEFAULT 0.0,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for repository lookups
CREATE INDEX IF NOT EXISTS idx_analysis_repo_url ON public.analysis_requests(repo_url);
CREATE INDEX IF NOT EXISTS idx_analysis_analyzed_at ON public.analysis_requests(analyzed_at DESC);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_requests ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous submissions (for website visitors submitting inquiries)
CREATE POLICY "Allow public insert on inquiries" 
    ON public.inquiries 
    FOR INSERT 
    WITH CHECK (true);

-- Allow public select on analysis logs (or restrict to authenticated users as needed)
CREATE POLICY "Allow public insert on analysis_requests" 
    ON public.analysis_requests 
    FOR INSERT 
    WITH CHECK (true);
