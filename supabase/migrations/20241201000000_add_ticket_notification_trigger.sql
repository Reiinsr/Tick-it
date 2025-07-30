-- Create a function to call the edge function when a ticket is created
CREATE OR REPLACE FUNCTION public.notify_category_admins()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function to send email notifications
  PERFORM
    net.http_post(
      url := 'https://ibgopagxutjwauxtsmff.supabase.co/functions/v1/notify-category-admins',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.header.apikey') || '"}',
      body := json_build_object(
        'ticketData', json_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'category', NEW.category,
          'description', NEW.description,
          'requester_name', (SELECT full_name FROM profiles WHERE user_id = NEW.requester_id),
          'date_created', NEW.date_created,
          'priority', NEW.priority
        )
      )::text
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_category_admins();

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions"; 