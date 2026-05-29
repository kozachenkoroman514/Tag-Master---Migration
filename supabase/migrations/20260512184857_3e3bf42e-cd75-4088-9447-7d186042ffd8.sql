ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS change_badge_type text,
  ADD COLUMN IF NOT EXISTS change_badge_style text;

UPDATE public.bug_reports
  SET change_badge_type = COALESCE(change_badge_type, 'update'),
      change_badge_style = COALESCE(change_badge_style, 'gradient')
  WHERE entry_kind = 'change';