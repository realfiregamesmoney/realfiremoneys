-- Enable realtime for profiles table to sync balance changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;