-- =============================================================
-- Seed data for local development
-- Run after: supabase db reset (auto-executed by Supabase CLI)
-- =============================================================

-- ============================================================
-- 1. Create users via Supabase Auth
-- ============================================================
-- Password: TestingPassword1 (bcrypt hash below)

-- Admin: p.fusacchia@wybe.it
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'p.fusacchia@wybe.it',
  crypt('TestingPassword1', gen_salt('bf')),
  now(),
  jsonb_build_object('name', 'Piero Fusacchia', 'image', ''),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  now(), now(), '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'p.fusacchia@wybe.it', 'email',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'p.fusacchia@wybe.it'),
  now(), now(), now()
);

-- Owner Wybe: fusacchia.piero+o1@gmail.com
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'fusacchia.piero+o1@gmail.com',
  crypt('TestingPassword1', gen_salt('bf')),
  now(),
  jsonb_build_object('name', 'Marco Bianchi', 'image', ''),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  now(), now(), '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'fusacchia.piero+o1@gmail.com', 'email',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'email', 'fusacchia.piero+o1@gmail.com'),
  now(), now(), now()
);

-- Owner Acme: fusacchia.piero+o2@gmail.com
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'fusacchia.piero+o2@gmail.com',
  crypt('TestingPassword1', gen_salt('bf')),
  now(),
  jsonb_build_object('name', 'Giulia Rossi', 'image', ''),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  now(), now(), '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000003',
  'fusacchia.piero+o2@gmail.com', 'email',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000003', 'email', 'fusacchia.piero+o2@gmail.com'),
  now(), now(), now()
);

-- Member Wybe: fusacchia.piero+m1@gmail.com
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'fusacchia.piero+m1@gmail.com',
  crypt('TestingPassword1', gen_salt('bf')),
  now(),
  jsonb_build_object('name', 'Luca Verdi', 'image', ''),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  now(), now(), '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000004',
  'fusacchia.piero+m1@gmail.com', 'email',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'email', 'fusacchia.piero+m1@gmail.com'),
  now(), now(), now()
);

-- ============================================================
-- 2. Promote admin user
-- ============================================================
-- user_profile rows are auto-created by trigger on auth.users insert

UPDATE public.user_profile
SET role = 'admin'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Mark all seed users as onboarding complete
UPDATE public.user_profile
SET onboarding_complete = true
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- ============================================================
-- 3. Create organizations
-- ============================================================
-- Triggers auto-create organization_profile and organization_style

INSERT INTO public.organization (id, name, slug) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Wybe', 'wybe'),
  ('b0000000-0000-0000-0000-000000000002', 'Acme', 'acme');

-- ============================================================
-- 4. Credit balances
-- ============================================================

INSERT INTO public.credit_balance (organization_id, balance)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 100),
  ('b0000000-0000-0000-0000-000000000002', 50);

-- ============================================================
-- 5. Organization memberships
-- ============================================================

INSERT INTO public.member (organization_id, user_id, role) VALUES
  -- Admin is member of Wybe
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  -- Owner of Wybe
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'owner'),
  -- Owner of Acme
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'owner'),
  -- Member of Wybe
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'member');

-- ============================================================
-- 6. Organization profiles (company info)
-- ============================================================

UPDATE public.organization_profile SET
  company_name = 'Wybe S.r.l.',
  vat_number = 'IT12345678901',
  pec = 'wybe@pec.it',
  phone = '+39 06 1234567',
  email = 'info@wybe.it',
  website = 'https://wybe.it',
  linkedin_url = 'https://linkedin.com/company/wybe',
  address = 'Via Roma 1, 00100 Roma RM',
  legal_address = 'Via Roma 1, 00100 Roma RM',
  admin_contact_name = 'Piero Fusacchia',
  admin_contact_email = 'p.fusacchia@wybe.it'
WHERE organization_id = 'b0000000-0000-0000-0000-000000000001';

UPDATE public.organization_profile SET
  company_name = 'Acme Corp S.p.A.',
  vat_number = 'IT98765432109',
  pec = 'acme@pec.it',
  phone = '+39 02 9876543',
  email = 'info@acme.example.com',
  website = 'https://acme.example.com',
  address = 'Via Milano 10, 20100 Milano MI',
  legal_address = 'Via Milano 10, 20100 Milano MI',
  admin_contact_name = 'Giulia Rossi',
  admin_contact_email = 'g.rossi@acme.example.com'
WHERE organization_id = 'b0000000-0000-0000-0000-000000000002';

-- ============================================================
-- 7. Organization styles (branding)
-- ============================================================

UPDATE public.organization_style SET
  aurora_color_primary = '#6366f1',
  aurora_color_secondary = '#8b5cf6',
  header_bg_color = '#1e1b4b',
  header_text_color = '#ffffff',
  button_bg_color = '#6366f1',
  button_text_color = '#ffffff',
  tab_bg_color = '#eef2ff'
WHERE organization_id = 'b0000000-0000-0000-0000-000000000001';

UPDATE public.organization_style SET
  aurora_color_primary = '#dc2626',
  aurora_color_secondary = '#f97316',
  header_bg_color = '#7f1d1d',
  header_text_color = '#ffffff',
  button_bg_color = '#dc2626',
  button_text_color = '#ffffff',
  tab_bg_color = '#fef2f2'
WHERE organization_id = 'b0000000-0000-0000-0000-000000000002';

-- ============================================================
-- 8. VCards - Wybe (5 cards)
-- ============================================================

INSERT INTO public.vcard (id, organization_id, first_name, last_name, slug, job_title, email, phone, phone_secondary, linkedin_url, status, user_id) VALUES
  -- Linked to owner o1 (Marco Bianchi)
  ('c0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Marco', 'Bianchi', 'marco-bianchi',
   'CEO & Founder', 'marco.bianchi@wybe.it', '+39 333 1111111', NULL,
   'https://linkedin.com/in/marcobianchi',
   'active', 'a0000000-0000-0000-0000-000000000002'),

  -- Linked to member m1 (Luca Verdi)
  ('c0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'Luca', 'Verdi', 'luca-verdi',
   'Software Engineer', 'luca.verdi@wybe.it', '+39 333 2222222', '+39 06 5551234',
   'https://linkedin.com/in/lucaverdi',
   'active', 'a0000000-0000-0000-0000-000000000004'),

  -- Not linked to any user
  ('c0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'Sofia', 'Conti', 'sofia-conti',
   'Head of Design', 'sofia.conti@wybe.it', '+39 333 3333333', NULL,
   'https://linkedin.com/in/sofiaconti',
   'active', NULL),

  ('c0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001',
   'Andrea', 'Moretti', 'andrea-moretti',
   'Sales Manager', 'andrea.moretti@wybe.it', '+39 333 4444444', NULL,
   NULL,
   'active', NULL),

  -- Suspended vcard
  ('c0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001',
   'Elena', 'Russo', 'elena-russo',
   'Marketing Specialist', 'elena.russo@wybe.it', '+39 333 5555555', NULL,
   NULL,
   'suspended', NULL);

-- ============================================================
-- 9. VCards - Acme (4 cards)
-- ============================================================

INSERT INTO public.vcard (id, organization_id, first_name, last_name, slug, job_title, email, phone, phone_secondary, linkedin_url, status, user_id) VALUES
  -- Linked to owner o2 (Giulia Rossi)
  ('c0000000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000002',
   'Giulia', 'Rossi', 'giulia-rossi',
   'Direttrice Generale', 'giulia.rossi@acme.example.com', '+39 340 6666666', NULL,
   'https://linkedin.com/in/giuliarossi',
   'active', 'a0000000-0000-0000-0000-000000000003'),

  ('c0000000-0000-0000-0000-000000000007',
   'b0000000-0000-0000-0000-000000000002',
   'Paolo', 'Ferrari', 'paolo-ferrari',
   'Responsabile Tecnico', 'paolo.ferrari@acme.example.com', '+39 340 7777777', '+39 02 5559876',
   'https://linkedin.com/in/paoloferrari',
   'active', NULL),

  ('c0000000-0000-0000-0000-000000000008',
   'b0000000-0000-0000-0000-000000000002',
   'Chiara', 'Colombo', 'chiara-colombo',
   'Responsabile HR', 'chiara.colombo@acme.example.com', '+39 340 8888888', NULL,
   NULL,
   'active', NULL),

  -- Archived vcard
  ('c0000000-0000-0000-0000-000000000009',
   'b0000000-0000-0000-0000-000000000002',
   'Roberto', 'Esposito', 'roberto-esposito',
   'Ex Consulente', 'roberto.esposito@acme.example.com', '+39 340 9999999', NULL,
   NULL,
   'archived', NULL);

-- ============================================================
-- 10. Physical cards - Wybe (6 cards, some assigned)
-- ============================================================

INSERT INTO public.physical_card (id, organization_id, code, vcard_id, status) VALUES
  -- Assigned to Marco Bianchi
  ('d0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA01', 'c0000000-0000-0000-0000-000000000001', 'assigned'),

  -- Assigned to Luca Verdi
  ('d0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA02', 'c0000000-0000-0000-0000-000000000002', 'assigned'),

  -- Assigned to Sofia Conti
  ('d0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA03', 'c0000000-0000-0000-0000-000000000003', 'assigned'),

  -- Free cards (not assigned)
  ('d0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA04', NULL, 'free'),

  ('d0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA05', NULL, 'free'),

  -- Disabled card
  ('d0000000-0000-0000-0000-000000000006',
   'b0000000-0000-0000-0000-000000000001',
   'WYBE-AA06', NULL, 'disabled');

-- ============================================================
-- 11. Physical cards - Acme (4 cards)
-- ============================================================

INSERT INTO public.physical_card (id, organization_id, code, vcard_id, status) VALUES
  -- Assigned to Giulia Rossi
  ('d0000000-0000-0000-0000-000000000007',
   'b0000000-0000-0000-0000-000000000002',
   'ACME-BB01', 'c0000000-0000-0000-0000-000000000006', 'assigned'),

  -- Assigned to Paolo Ferrari
  ('d0000000-0000-0000-0000-000000000008',
   'b0000000-0000-0000-0000-000000000002',
   'ACME-BB02', 'c0000000-0000-0000-0000-000000000007', 'assigned'),

  -- Free
  ('d0000000-0000-0000-0000-000000000009',
   'b0000000-0000-0000-0000-000000000002',
   'ACME-BB03', NULL, 'free'),

  ('d0000000-0000-0000-0000-000000000010',
   'b0000000-0000-0000-0000-000000000002',
   'ACME-BB04', NULL, 'free');

-- ============================================================
-- Summary
-- ============================================================
-- Users:
--   p.fusacchia@wybe.it       -> Platform admin, admin member of Wybe
--   fusacchia.piero+o1@gmail.com -> Owner of Wybe (Marco Bianchi)
--   fusacchia.piero+o2@gmail.com -> Owner of Acme (Giulia Rossi)
--   fusacchia.piero+m1@gmail.com -> Member of Wybe (Luca Verdi)
--   Password for all: TestingPassword1
--
-- Organizations:
--   Wybe (slug: wybe) - 5 vcards, 6 physical cards
--   Acme (slug: acme) - 4 vcards, 4 physical cards
--
-- VCards:
--   Wybe: Marco Bianchi (CEO), Luca Verdi (Engineer), Sofia Conti (Design),
--         Andrea Moretti (Sales), Elena Russo (Marketing, suspended)
--   Acme: Giulia Rossi (DG), Paolo Ferrari (CTO), Chiara Colombo (HR),
--         Roberto Esposito (ex consulente, archived)
--
-- Physical cards:
--   Wybe: 3 assigned, 2 free, 1 disabled
--   Acme: 2 assigned, 2 free
