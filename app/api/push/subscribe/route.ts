import { NextRequest, NextResponse } from 'next/server';
import type { PushSubscriptionJSON } from 'web-push';
import { upsertPushSubscription } from '../../../../lib/tasks-store';
import { getDeviceIdFromRequest } from '../../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const deviceId = getDeviceIdFromRequest(req);

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device id' }, { status: 400 });
    }

    const body = await req.json();
    const { subscription } = body as { subscription: PushSubscriptionJSON };
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!subscription?.endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const saved = await upsertPushSubscription({
      deviceId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    });

    return NextResponse.json({ ok: true, subscriptionId: saved?.id ?? null });
  } catch (error) {
    console.error('[push/subscribe]', error);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
