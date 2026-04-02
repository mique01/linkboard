import { NextRequest, NextResponse } from 'next/server';
import {
  getVapidPublicKey,
  hasVapidConfiguration,
  sendPushPayload,
} from '../../../../lib/push';
import {
  deletePushSubscriptionById,
  listPushSubscriptionsForDevice,
} from '../../../../lib/tasks-store';
import { getDeviceIdFromRequest } from '../../../../lib/supabase';

export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}

export async function POST(req: NextRequest) {
  try {
    if (!hasVapidConfiguration()) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    const deviceId = getDeviceIdFromRequest(req);

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device id' }, { status: 400 });
    }

    const body = await req.json();
    const { title, message, endpoint } = body as {
      title: string;
      message?: string;
      endpoint?: string;
    };

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const subscriptions = await listPushSubscriptionsForDevice(deviceId);
    const targets = endpoint
      ? subscriptions.filter((subscription) => subscription.endpoint === endpoint)
      : subscriptions;

    if (targets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, note: 'No subscriptions found' });
    }

    const payload = JSON.stringify({ title, body: message ?? '' });
    const result = await sendPushPayload(targets, payload);

    for (const subscriptionId of result.expiredSubscriptionIds) {
      await deletePushSubscriptionById(subscriptionId);
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed.length,
      removedSubscriptions: result.expiredSubscriptionIds.length,
    });
  } catch (error) {
    console.error('[push/send]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
