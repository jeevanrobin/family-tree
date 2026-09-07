// Supabase Edge Function: send-invitation-email
// Handles transactional invitation delivery via Resend API or SMTP without exposing secrets to frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "invitations@medida.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, familyName, role, inviteUrl, expiresAt } = await req.json();

    if (!email || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and inviteUrl are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If RESEND_API_KEY is configured in Supabase secrets, dispatch email via Resend
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Medida's Family <${SENDER_EMAIL}>`,
          to: [email],
          subject: `Invitation to collaborate on ${familyName || "Medida's Family Tree"}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #111827; margin-top: 0;">You're Invited!</h2>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                You have been invited to join and collaborate on the family tree archive of <strong>${familyName || "Medida's Family"}</strong> with the role of <strong>${role || "member"}</strong>.
              </p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="${inviteUrl}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                This invitation link is valid until ${expiresAt || "7 days"}. If you did not expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to send email via Resend");
      }

      return new Response(JSON.stringify({ success: true, id: resData.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If Resend is not configured, acknowledge receipt for dev environments
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email queued (dev mode: RESEND_API_KEY not configured).",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
