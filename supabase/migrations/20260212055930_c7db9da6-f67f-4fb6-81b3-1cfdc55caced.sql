-- Enable realtime for audit_logs to power the winners ticker
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;