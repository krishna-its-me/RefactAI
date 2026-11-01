-- =========================================================================
-- RefactAI Database Schema for Supabase
-- Tables: user_profiles, inquiries, analysis_requests, git_history_logs
-- Supports Google OAuth, Phone Number OTP Authentication, and Git History
-- =========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    display_name TEXT,
    avatar_url TEXT,
    auth_provider TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email and phone
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);

-- 2. Inquiries Table (Client inquiries & audit requests)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    inquiry_type TEXT DEFAULT 'Enterprise Debt Audit',
    repo_url TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON public.inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- 3. Analysis Requests Table (Repo health audits)
CREATE TABLE IF NOT EXISTS public.analysis_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    repo_name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    overall_debt_score NUMERIC(5,2) NOT NULL,
    health_status TEXT NOT NULL,
    total_files INT NOT NULL,
    critical_risk_files INT DEFAULT 0,
    avg_complexity NUMERIC(5,2) DEFAULT 0.0,
    active_model TEXT DEFAULT 'random_forest',
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_repo_url ON public.analysis_requests(repo_url);
CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON public.analysis_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_analyzed_at ON public.analysis_requests(analyzed_at DESC);

-- 4. Git History Logs Table (Detailed commits and process metrics mined from repos)
CREATE TABLE IF NOT EXISTS public.git_history_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.analysis_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    repo_url TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    author TEXT,
    commit_date TIMESTAMPTZ,
    commit_message TEXT,
    code_churn INT DEFAULT 0,
    is_bug_fix BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_git_logs_analysis_id ON public.git_history_logs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_git_logs_repo_url ON public.git_history_logs(repo_url);
CREATE INDEX IF NOT EXISTS idx_git_logs_author ON public.git_history_logs(author);

-- =========================================================================
-- Trigger to automatically create or update user_profiles on Supabase Auth
-- (Triggers on new user sign-in via Google OAuth, Phone OTP, or Magic Link)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, phone, display_name, avatar_url, auth_provider, last_sign_in)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, NEW.phone, 'RefactAI User'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'phone_or_email'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_sign_in = NOW(),
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- Row Level Security (RLS) Configuration
-- =========================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.git_history_logs ENABLE ROW LEVEL SECURITY;

-- 1. user_profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. inquiries policies (allow public inserts, users view their own inquiries)
CREATE POLICY "Allow public insert on inquiries"
    ON public.inquiries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own inquiries"
    ON public.inquiries FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- 3. analysis_requests policies
CREATE POLICY "Allow public insert on analysis_requests"
    ON public.analysis_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own analysis history"
    ON public.analysis_requests FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'service_role');

-- 4. git_history_logs policies
CREATE POLICY "Allow public insert on git_history_logs"
    ON public.git_history_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view git history"
    ON public.git_history_logs FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'service_role');
