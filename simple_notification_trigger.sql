-- Simple notification trigger that should work
CREATE OR REPLACE FUNCTION public.notify_category_admins()
RETURNS TRIGGER AS $$
DECLARE
  request_body TEXT;
BEGIN
  -- Build the request body
  request_body := json_build_object(
    'ticketData', json_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'description', NEW.description,
      'requester_name', (SELECT full_name FROM profiles WHERE user_id = NEW.requester_id),
      'date_created', NEW.date_created
    )
  )::text;

  -- Call the edge function
  PERFORM extensions.http_post(
    'https://ibgopagxutjwauxtsmff.supabase.co/functions/v1/notify-category-admins',
    json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.header.apikey')
    ),
    request_body
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the ticket creation
    RAISE LOG 'Error in notify_category_admins: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_category_admins(); 