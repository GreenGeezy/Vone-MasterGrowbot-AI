
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Parse and validate request body
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'A valid email address is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Read environment variables
    const whopApiKey = Deno.env.get('WHOP_API_KEY');
    if (!whopApiKey) {
      throw new Error('Missing WHOP_API_KEY environment variable');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // 4. Create Supabase admin client (service_role — needed to write to claimed_purchases)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Query Whop API for recent paid payments by email
    // Correct endpoint: /api/v1/payments with query= for email search, statuses=paid
    const encodedEmail = encodeURIComponent(email);
    const whopRes = await fetch(
      `https://api.whop.com/api/v1/payments?query=${encodedEmail}&statuses=paid&order=created_at&direction=desc&first=10`,
      {
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
        },
      }
    );

    if (!whopRes.ok) {
      const errText = await whopRes.text();
      throw new Error(`Whop API error ${whopRes.status}: ${errText}`);
    }

    const whopData = await whopRes.json();
    const payments: any[] = whopData.data || whopData.payments || whopData || [];

    // 6. Filter to payments created within the last 2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recentPayments = payments.filter((p: any) => {
      const createdMs = typeof p.created_at === 'number'
        ? p.created_at * 1000
        : new Date(p.created_at).getTime();
      return createdMs >= twoHoursAgo;
    });

    // Sort most recent first
    recentPayments.sort((a: any, b: any) => {
      const aMs = typeof a.created_at === 'number' ? a.created_at * 1000 : new Date(a.created_at).getTime();
      const bMs = typeof b.created_at === 'number' ? b.created_at * 1000 : new Date(b.created_at).getTime();
      return bMs - aMs;
    });

    // 7. Find most recent payment not already in claimed_purchases
    let matchedPayment: any = null;
    let planType: 'credits' | 'annual' | null = null;
    let creditsAmount = 0;
    let planName = '';

    for (const payment of recentPayments) {
      const paymentId = payment.id;

      // Check if already claimed
      const { data: existing } = await adminClient
        .from('claimed_purchases')
        .select('whop_payment_id')
        .eq('whop_payment_id', paymentId)
        .maybeSingle();

      if (existing) continue; // Already claimed — skip

      // Determine plan type by payment.product.title (case-insensitive substring match)
      // Whop API v1: plan object only has {id}, product object has {id, title, route}
      const name: string = (payment.product?.title || '').toLowerCase();

      if (name.includes('seedling pack')) {
        planType = 'credits';
        creditsAmount = 10;
        planName = payment.product?.title || 'Seedling Pack';
      } else if (name.includes('grower pack')) {
        planType = 'credits';
        creditsAmount = 25;
        planName = payment.product?.title || 'Grower Pack';
      } else if (name.includes('master pack')) {
        planType = 'credits';
        creditsAmount = 60;
        planName = payment.product?.title || 'Master Pack';
      } else if (name.includes('pro annual')) {
        planType = 'annual';
        planName = payment.product?.title || 'Pro Annual';
      }

      if (planType) {
        matchedPayment = payment;
        break;
      }
    }

    // 8. No unclaimed matching payment found
    if (!matchedPayment || !planType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No recent unclaimed payment found. If you just purchased, wait 1 minute and try again.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Insert into claimed_purchases to prevent double-crediting
    const createdAtMs = typeof matchedPayment.created_at === 'number'
      ? matchedPayment.created_at * 1000
      : new Date(matchedPayment.created_at).getTime();

    const expiresAt = planType === 'annual'
      ? new Date(createdAtMs + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: insertError } = await adminClient.from('claimed_purchases').insert({
      whop_payment_id: matchedPayment.id,
      whop_email: email,
      pack_name: planName,
      tokens_credited: planType === 'credits' ? creditsAmount : null,
    });

    if (insertError) {
      // If duplicate key (race condition), treat as already claimed
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This payment has already been claimed.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // 10. Return success response
    if (planType === 'credits') {
      return new Response(
        JSON.stringify({ success: true, type: 'credits', credits_credited: creditsAmount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, type: 'annual', expires_at: expiresAt }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('whop-activate-tokens error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
