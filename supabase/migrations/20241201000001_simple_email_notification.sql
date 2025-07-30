-- Alternative: Simple email notification using external email service
-- This approach uses a database trigger to send emails via an external service

-- Create a function to send email notifications
CREATE OR REPLACE FUNCTION public.send_category_admin_notification()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails TEXT[];
  admin_email TEXT;
  email_body TEXT;
  email_subject TEXT;
BEGIN
  -- Get admin emails based on category
  IF NEW.category = 'IT' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM profiles 
    WHERE role = 'it_admin' AND email IS NOT NULL;
  ELSIF NEW.category = 'Maintenance' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM profiles 
    WHERE role = 'maintenance_admin' AND email IS NOT NULL;
  ELSIF NEW.category = 'Housekeeping' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM profiles 
    WHERE role = 'housekeeping_admin' AND email IS NOT NULL;
  END IF;

  -- If no admins found, return
  IF admin_emails IS NULL OR array_length(admin_emails, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Prepare email content
  email_subject := 'New ' || NEW.category || ' Ticket: ' || NEW.title;
  email_body := '
    <h2>New Ticket Created</h2>
    <p><strong>Category:</strong> ' || NEW.category || '</p>
    <p><strong>Title:</strong> ' || NEW.title || '</p>
    <p><strong>Description:</strong> ' || NEW.description || '</p>
    <p><strong>Requester:</strong> ' || (SELECT full_name FROM profiles WHERE user_id = NEW.requester_id) || '</p>
    <p><strong>Date Created:</strong> ' || NEW.date_created || '</p>
    <br>
    <p>Please review and assign this ticket as needed.</p>
  ';

  -- Send email to each admin
  FOREACH admin_email IN ARRAY admin_emails
  LOOP
    -- You can integrate with services like Resend, SendGrid, or use Supabase's email service
    -- Example with Resend (you'll need to set up the API key in Supabase secrets):
    PERFORM
      net.http_post(
        url := 'https://api.resend.com/emails',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.resend_api_key') || '"}',
        body := json_build_object(
          'from', 'noreply@yourdomain.com',
          'to', admin_email,
          'subject', email_subject,
          'html', email_body
        )::text
      );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_ticket_created_simple ON public.tickets;
CREATE TRIGGER on_ticket_created_simple
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.send_category_admin_notification(); 