-- Enable RLS and restrict realtime.messages to authenticated users
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime messages"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can send realtime messages"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);