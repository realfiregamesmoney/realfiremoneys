GRANT ALL ON TABLE public.quiz_events TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_tickets TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_responses TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_rankings TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
