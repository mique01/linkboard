import webpush from 'web-push';
import type { PushSubscriptionRecord } from './tasks-store';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@linkboard.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export function hasVapidConfiguration() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export async function sendPushPayload(
  subscriptions: PushSubscriptionRecord[],
  payload: string
) {
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );

        return {
          ok: true as const,
          subscriptionId: subscription.id,
        };
      } catch (error) {
        return {
          ok: false as const,
          subscriptionId: subscription.id,
          error,
        };
      }
    })
  );

  const sentSubscriptionIds: string[] = [];
  const expiredSubscriptionIds: string[] = [];
  const failed: Array<{ message: string; statusCode?: number }> = [];

  for (const result of results) {
    if (result.ok) {
      sentSubscriptionIds.push(result.subscriptionId);
      continue;
    }

    const error = result.error as { statusCode?: number; message?: string } | undefined;
    const statusCode = error?.statusCode;
    const subscriptionId = result.subscriptionId;

    if ((statusCode === 404 || statusCode === 410) && subscriptionId) {
      expiredSubscriptionIds.push(subscriptionId);
      continue;
    }

    failed.push({
      message:
        error instanceof Error ? error.message : error?.message ?? 'Unknown push error',
      statusCode,
    });
  }

  return {
    sent: sentSubscriptionIds.length,
    failed,
    expiredSubscriptionIds,
  };
}
