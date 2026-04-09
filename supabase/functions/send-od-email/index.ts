import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Webhook triggered', payload)

    const { record, table, type, old_record } = payload
    
    if (table !== 'od_requests') return new Response('Not od_requests', { status: 200 })

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Handle Student Submission -> Notify Coordinator
    if (type === 'INSERT' && record.status === 'Pending Coordinator') {
      return await notifyCoordinators(supabase, record)
    }

    // 2. Handle Coordinator Approval -> Notify HOD
    if (type === 'UPDATE' && record.status === 'Pending HOD' && old_record.status === 'Pending Coordinator') {
      return await notifyHODs(supabase, record)
    }

    // 3. Handle HOD Approval -> Notify Student
    if (type === 'UPDATE' && record.status === 'Approved' && old_record.status === 'Pending HOD') {
      return await notifyStudent(supabase, record)
    }

    return new Response(JSON.stringify({ message: 'No action needed' }), { status: 200 })
  } catch (err) {
    console.error('Edge Function Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function notifyCoordinators(supabase: any, record: any) {
  const { data: coordinators } = await supabase.from('profiles').select('id, email').eq('role', 'coordinator').eq('department', record.department)
  if (!coordinators?.length) return new Response('No coordinators', { status: 200 })
  
  for (const coordinator of coordinators) {
    // 1. Email
    if (coordinator.email) {
      await sendEmail(coordinator.email, `New OD: ${record.event_title}`, `
        <h2>New OD Request</h2>
        <p>Student: ${record.student_name}</p>
        <p>Event: ${record.event_title}</p>
        <p>Please review in your Coordinator Dashboard.</p>
      `)
    }
    // 2. In-App
    await supabase.from('notifications').insert({
      user_id: coordinator.id,
      message: `New OD request from ${record.student_name} for ${record.event_title}`,
      type: 'info',
      read: false
    })
  }
  return new Response('Coordinators notified', { status: 200 })
}

async function notifyHODs(supabase: any, record: any) {
  const { data: hods } = await supabase.from('profiles').select('id, email').eq('role', 'hod').eq('department', record.department)
  if (!hods?.length) return new Response('No HODs', { status: 200 })

  for (const hod of hods) {
    // 1. Email
    if (hod.email) {
      await sendEmail(hod.email, `Coordinator Approved: ${record.event_title}`, `
        <h2>OD Authorization Required</h2>
        <p>Student: ${record.student_name}</p>
        <p>Event: ${record.event_title}</p>
        <p>Coordinator has approved. Final authorization required in HOD Dashboard.</p>
      `)
    }
    // 2. In-App
    await supabase.from('notifications').insert({
      user_id: hod.id,
      message: `OD for ${record.student_name} approved by Activity Coordinator. Final authorization needed.`,
      type: 'info',
      read: false
    })
  }
  return new Response('HODs notified', { status: 200 })
}

async function notifyStudent(supabase: any, record: any) {
  const { data: student } = await supabase.from('profiles').select('email').eq('id', record.user_id).single()
  
  // 1. Email
  if (student?.email) {
    await sendEmail(student.email, `OD Approved: ${record.event_title}`, `
      <h2>Your OD Request has been Approved!</h2>
      <p>Event: ${record.event_title}</p>
      <p>You can now download your OD letter from the portal.</p>
    `)
  }

  // 2. In-App
  await supabase.from('notifications').insert({
    user_id: record.user_id,
    message: `Your OD for ${record.event_title} has been sanctioned!`,
    type: 'success',
    read: false
  })

  return new Response('Student notified', { status: 200 })
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured in Edge Function')
    return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500 })
  }

  return await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'ESEC Student On-Duty Management System <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  })
}
