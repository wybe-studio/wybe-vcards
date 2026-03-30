-- MFA restrictive policies (commented out by default)
-- The is_mfa_compliant() function is defined in 01a-functions.sql.
-- Uncomment these when you want to require MFA for sensitive data:

-- create policy "restrict_mfa_leads" on public.lead
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());

-- create policy "restrict_mfa_credits" on public.credit_balance
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());

-- create policy "restrict_mfa_ai_chat" on public.ai_chat
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());
