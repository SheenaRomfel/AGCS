// supabase/functions/create-student-account/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_PASSWORD = "Student123!";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Browsers send a preflight OPTIONS request before the real POST.
  // Without answering this, the browser blocks the actual request.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();
    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Name and email are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Client using the CALLER's own token, just to verify who is calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client using the service role key — only usable here, server-side.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Confirm the caller is actually a teacher before doing anything.
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== "teacher") {
      return new Response(JSON.stringify({ error: "Only teachers can add students." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Make sure a students row exists BEFORE creating the auth user, so the
    // auto-link trigger can match it by email as soon as the user is created.
    const { data: existingStudent } = await adminClient
      .from("students")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let studentId = existingStudent?.id;
    if (!studentId) {
      const { data: newStudent, error: studentError } = await adminClient
        .from("students")
        .insert({ name: name.trim(), email: normalizedEmail })
        .select()
        .single();
      if (studentError) {
        return new Response(JSON.stringify({ error: studentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      studentId = newStudent.id;
    }

    // Create the login account with the default password.
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Belt-and-suspenders: explicitly link the profile too, in case the
    // trigger's timing doesn't line up.
    await adminClient
      .from("profiles")
      .update({ role: "student", student_id: studentId })
      .eq("id", newUser.user.id);

    return new Response(
      JSON.stringify({ success: true, studentId, defaultPassword: DEFAULT_PASSWORD }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});