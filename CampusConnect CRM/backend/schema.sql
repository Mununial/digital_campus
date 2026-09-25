-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if they exist
DROP TABLE IF EXISTS voice_settings;
DROP TABLE IF EXISTS call_logs;
DROP TABLE IF EXISTS call_queue;
DROP TABLE IF EXISTS call_campaigns;
DROP TABLE IF EXISTS conversation_summaries;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS knowledge_base;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS automation_logs;
DROP TABLE IF EXISTS automation_rules;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS followups;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COUNSELOR', 'MANAGER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(20),
    course_interested VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    source VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'NEW',
    assigned_counselor VARCHAR(255),
    counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create followups table
CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    followup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create automation_rules table
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    condition_json JSONB DEFAULT '{}',
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create automation_logs table
CREATE TABLE automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    trigger_event VARCHAR(100),
    action_type VARCHAR(100),
    execution_status VARCHAR(50),
    execution_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create email_logs table
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    subject VARCHAR(255),
    send_status VARCHAR(50),
    provider_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI & KNOWLEDGE BASE
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100),
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    channel VARCHAR(50) DEFAULT 'WEB_CHAT',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    detected_intent VARCHAR(100),
    sentiment VARCHAR(50),
    summary TEXT,
    next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VOICE INFRASTRUCTURE
CREATE TABLE call_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE call_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    call_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    provider_name VARCHAR(100),
    provider_call_id VARCHAR(255),
    call_status VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    outcome VARCHAR(100),
    transcript TEXT,
    ai_summary TEXT,
    detected_intent VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) DEFAULT 'EXOTEL',
    voice_language VARCHAR(50) DEFAULT 'en-IN',
    retry_enabled BOOLEAN DEFAULT TRUE,
    max_retries INTEGER DEFAULT 3,
    call_timeout_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_leads_counselor_id ON leads(counselor_id);
CREATE INDEX idx_automation_trigger ON automation_rules(trigger_event);
CREATE INDEX idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_call_queue_status ON call_queue(call_status);
CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
-- Default Admin (Pass: admin123)
INSERT INTO users (full_name, email, password_hash, role) 
VALUES ('System Admin', 'admin@crm.com', '$2b$10$2OfZbCgj41ecubE2.o0VO.4Vn77sBGnHXY6BA4zKFJYWhyiyZMOmO', 'ADMIN');

-- Default Counselor (Pass: counselor123)
INSERT INTO users (full_name, email, password_hash, role) 
VALUES ('Jane Counselor', 'counselor@crm.com', '$2b$10$G.8h/MF0COMiAODRL6Ne0..aSksFiRebQTJVqFmxJnxS5saJEqAq.', 'COUNSELOR');

-- Default Automation Rules
INSERT INTO automation_rules (name, trigger_event, action_type, action_config) VALUES 
('Auto-Log New Leads', 'LEAD_CREATED', 'CREATE_ACTIVITY', '{"template": "New lead system entry created"}'),
('Interested Status Assignment', 'LEAD_STATUS_CHANGED', 'AUTO_ASSIGN', '{"status": "INTERESTED"}'),
('Missed Followup Detector', 'FOLLOWUP_MISSED', 'CREATE_ACTIVITY', '{"template": "CRITICAL: Followup was missed by counselor"}'),
('Welcome Email on Inquiry', 'LEAD_CREATED', 'SEND_EMAIL', '{"template": "WELCOME_INQUIRY"}'),
('Admin Alert on New Lead', 'LEAD_CREATED', 'SEND_EMAIL', '{"template": "ADMIN_NEW_LEAD", "to_admin": true}'),
('Brochure Email for Interested', 'LEAD_STATUS_CHANGED', 'SEND_EMAIL', '{"status": "INTERESTED", "template": "BROCHURE_DETAILS"}'),
('Auto AI Call on New Lead', 'LEAD_CREATED', 'ENQUEUE_CALL', '{"priority": 1}'),
('Retry Call on No Response', 'LEAD_STATUS_CHANGED', 'ENQUEUE_CALL', '{"status": "NO_RESPONSE", "priority": 2}');

-- Seed Knowledge Base
INSERT INTO knowledge_base (category, title, content) VALUES 
('GENERAL', 'About College', 'CampusConnect University is a premier institution founded in 2005. It is known for its world-class infrastructure and 100% placement record.'),
('FEES', 'B.Tech Fee Structure', 'The annual tuition fee for B.Tech CSE is ₹2,50,000 per year. Other branches like Civil and Mechanical are ₹1,80,000 per year.'),
('HOSTEL', 'Hostel Facilities', 'We have separate AC and Non-AC hostels for boys and girls. AC Hostel fee: ₹1,20,000/year. Non-AC: ₹80,000/year. Includes 4 meals a day.'),
('ELIGIBILITY', 'Admission Criteria', 'For B.Tech, student must have 60% in Physics, Chemistry, and Math. JEE Mains score is preferred but not mandatory.'),
('PLACEMENT', 'Placement Statistics 2024', 'Highest Package: ₹45 LPA (Microsoft). Average Package: ₹8.5 LPA. Over 200+ recruiters visit every year.'),
('DOCUMENTS', 'Required Documents', 'Original 10th & 12th Marksheets, Migration Certificate, Adhaar Card, 5 Passport size photos, and Character Certificate.');

-- Seed Voice Settings
INSERT INTO voice_settings (provider_name, voice_language) VALUES ('EXOTEL', 'en-IN');
