ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS shift_auto_resume_time TEXT NOT NULL DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS shift_auto_end_time TEXT NOT NULL DEFAULT '16:30',
  ADD COLUMN IF NOT EXISTS shift_end_prompt_lead_minutes INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS shift_auto_schedule_enabled BOOLEAN NOT NULL DEFAULT true;