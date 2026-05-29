UPDATE public.orders
SET comments = CASE
  WHEN comments IS NULL OR btrim(comments) = '' THEN concat('[', to_char(now(),'FMMM/FMDD'), '] HOLD REMOVED: Hold removed')
  ELSE comments || E'\n' || concat('[', to_char(now(),'FMMM/FMDD'), '] HOLD REMOVED: Hold removed')
END
WHERE id = '58cdc080-e1ae-4de9-b2f2-c64d660636b8';