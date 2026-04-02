import { NextRequest, NextResponse } from 'next/server';
import {
  claimTaskNotification,
  deletePushSubscriptionById,
  listDueUnnotifiedTasks,
  listPushSubscriptionsForUser,
  setTaskNotified,
} from '../../../lib/tasks-store';
import { hasVapidConfiguration, sendPushPayload } from '../../../lib/push';

function isAuthorizedCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error('Missing required env var: CRON_SECRET');
  }

  const authorization = req.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;

  const headerSecret = req.headers.get('x-cron-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');

  return bearer === secret || headerSecret === secret || querySecret === secret;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasVapidConfiguration()) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    const dueTasks = await listDueUnnotifiedTasks(new Date().toISOString());

    let processed = 0;
    let sent = 0;
    let retriedLater = 0;
    let skippedAlreadyClaimed = 0;
    let removedSubscriptions = 0;

    for (const task of dueTasks) {
      const claimedTask = await claimTaskNotification(task.id);

      if (!claimedTask) {
        skippedAlreadyClaimed += 1;
        continue;
      }

      const subscriptions = await listPushSubscriptionsForUser(task.user_id);

      if (subscriptions.length === 0) {
        await setTaskNotified(task.id, false);
        retriedLater += 1;
        continue;
      }

      const payload = JSON.stringify({
        title: 'Recordatorio',
        body: task.title
          ? `Tenes una tarea pendiente: ${task.title}`
          : 'Tenes una tarea pendiente',
      });

      const result = await sendPushPayload(subscriptions, payload);

      for (const subscriptionId of result.expiredSubscriptionIds) {
        await deletePushSubscriptionById(subscriptionId);
        removedSubscriptions += 1;
      }

      if (result.sent === 0) {
        await setTaskNotified(task.id, false);
        retriedLater += 1;
        continue;
      }

      processed += 1;
      sent += result.sent;
    }

    return NextResponse.json({
      ok: true,
      scanned: dueTasks.length,
      processed,
      sent,
      retriedLater,
      skippedAlreadyClaimed,
      removedSubscriptions,
    });
  } catch (error) {
    console.error('[reminders/get]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
