import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Body = {
  token?: string;
  token_hash?: string;
  type?: string;
};

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Sign in to verify your email.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Email verification is not configured yet.' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) {
    return json({ error: 'Could not verify your identity.' }, 401);
  }

  const body = await req.json().catch(() => ({})) as Body;
  const token = body.token?.trim();
  const tokenHash = body.token_hash?.trim();
  if (!token && !tokenHash) {
    return json({ error: 'Enter the code from your email, or open the link we sent.' }, 400);
  }

  const otpType = body.type === 'magiclink' || body.type === 'signup' || body.type === 'email'
    ? body.type
    : 'email';

  const verifyClient = createClient(supabaseUrl, anonKey);
  const result = tokenHash
    ? await verifyClient.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
    : await verifyClient.auth.verifyOtp({ email: user.email, token: token ?? '', type: otpType });

  if (result.error) {
    const fallback = token
      ? await verifyClient.auth.verifyOtp({ email: user.email, token, type: 'magiclink' })
      : result;
    if (fallback.error) {
      return json({ error: 'That code or link is not valid. Request a new email and try again.' }, 400);
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient
    .from('profile_settings')
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) {
    return json({ error: 'We confirmed the email, but could not save the badge. Try again.' }, 500);
  }

  return json({ ok: true }, 200);
};
