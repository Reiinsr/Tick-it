import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticketData } = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get category admins for this ticket's category
    const categoryRoleMap = {
      'IT': 'it_admin',
      'Maintenance': 'maintenance_admin', 
      'Housekeeping': 'housekeeping_admin'
    }
    
    const adminRole = categoryRoleMap[ticketData.category as keyof typeof categoryRoleMap]
    
    if (!adminRole) {
      throw new Error(`Invalid category: ${ticketData.category}`)
    }

    // Fetch category admins
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', adminRole)

    if (adminError) {
      throw new Error(`Error fetching admins: ${adminError.message}`)
    }

    if (!admins || admins.length === 0) {
      console.log(`No ${adminRole} found for category ${ticketData.category}`)
      return new Response(JSON.stringify({ message: 'No admins found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Send emails to all category admins using Resend
    const emailPromises = admins.map(async (admin) => {
      const emailData = {
        to: admin.email,
        subject: `New ${ticketData.category} Ticket: ${ticketData.title}`,
        html: `
          <h2>New Ticket Created</h2>
          <p><strong>Category:</strong> ${ticketData.category}</p>
          <p><strong>Title:</strong> ${ticketData.title}</p>
          <p><strong>Description:</strong> ${ticketData.description}</p>
          <p><strong>Requester:</strong> ${ticketData.requester_name}</p>
          <p><strong>Date Created:</strong> ${new Date(ticketData.date_created).toLocaleString()}</p>
          <br>
          <p>Please review and assign this ticket as needed.</p>
          <p>View ticket at: <a href="https://tick-it.space/admin">Admin Dashboard</a></p>
        `
      }

      try {
        // Send email using Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Tick-it <noreply@tick-it.space>',
            to: admin.email,
            subject: emailData.subject,
            html: emailData.html
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`Failed to send email to ${admin.email}:`, errorData)
          return { success: false, email: admin.email, error: errorData }
        }

        console.log(`Successfully sent email to ${admin.email}`)
        return { success: true, email: admin.email }
      } catch (error) {
        console.error(`Error sending email to ${admin.email}:`, error)
        return { success: false, email: admin.email, error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`Sent ${successful.length} emails, ${failed.length} failed`)

    return new Response(JSON.stringify({
      message: `Sent ${successful.length} notifications`,
      successful: successful.map(r => r.email),
      failed: failed.map(r => ({ email: r.email, error: r.error }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in notify-category-admins:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 