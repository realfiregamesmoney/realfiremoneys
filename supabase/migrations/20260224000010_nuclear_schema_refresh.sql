-- Forçar limpeza de cache e permissões totais para o Mega Quiz
GRANT ALL ON TABLE public.quiz_events TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_tickets TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_responses TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_rankings TO postgres, anon, authenticated, service_role;

-- Comandos de refresh de cache do PostgREST
ALTER TABLE public.quiz_events REPLICA IDENTITY FULL;
COMMENT ON TABLE public.quiz_events IS 'Refreshed at 2026-02-22';

NOTIFY pgrst, 'reload schema';
