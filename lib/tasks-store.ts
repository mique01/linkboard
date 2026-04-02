import { supabaseAdminRequest } from './supabase';

export type TaskRecord = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  notified: boolean;
  created_at: string;
};

export type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function listTasksForUser(userId: string) {
  return supabaseAdminRequest<TaskRecord[]>(
    `/rest/v1/tasks${buildQuery({
      select: 'id,user_id,title,description,due_date,notified,created_at',
      user_id: `eq.${userId}`,
      order: 'due_date.asc',
    })}`
  );
}

export async function createTaskForUser(input: {
  userId: string;
  title: string;
  description?: string | null;
  dueDate: string;
}) {
  const rows = await supabaseAdminRequest<TaskRecord[]>('/rest/v1/tasks', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify([
      {
        user_id: input.userId,
        title: input.title,
        description: input.description ?? null,
        due_date: input.dueDate,
      },
    ]),
  });

  return rows[0] ?? null;
}

export async function deleteTaskForUser(taskId: string, userId: string) {
  const rows = await supabaseAdminRequest<TaskRecord[]>(
    `/rest/v1/tasks${buildQuery({
      select: 'id',
      id: `eq.${taskId}`,
      user_id: `eq.${userId}`,
    })}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );

  return rows.length > 0;
}

export async function listDueUnnotifiedTasks(nowIso: string) {
  return supabaseAdminRequest<TaskRecord[]>(
    `/rest/v1/tasks${buildQuery({
      select: 'id,user_id,title,description,due_date,notified,created_at',
      due_date: `lte.${nowIso}`,
      notified: 'eq.false',
      order: 'due_date.asc',
      limit: 100,
    })}`
  );
}

export async function claimTaskNotification(taskId: string) {
  const rows = await supabaseAdminRequest<TaskRecord[]>(
    `/rest/v1/tasks${buildQuery({
      select: 'id,user_id,title,description,due_date,notified,created_at',
      id: `eq.${taskId}`,
      notified: 'eq.false',
    })}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        notified: true,
      }),
    }
  );

  return rows[0] ?? null;
}

export async function setTaskNotified(taskId: string, notified: boolean) {
  await supabaseAdminRequest<null>(
    `/rest/v1/tasks${buildQuery({
      id: `eq.${taskId}`,
    })}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ notified }),
    }
  );
}

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const rows = await supabaseAdminRequest<PushSubscriptionRecord[]>(
    '/rest/v1/push_subscriptions?on_conflict=user_id,endpoint',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          user_id: input.userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        },
      ]),
    }
  );

  return rows[0] ?? null;
}

export async function listPushSubscriptionsForUser(userId: string) {
  return supabaseAdminRequest<PushSubscriptionRecord[]>(
    `/rest/v1/push_subscriptions${buildQuery({
      select: 'id,user_id,endpoint,p256dh,auth,created_at',
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
    })}`
  );
}

export async function deletePushSubscriptionById(subscriptionId: string) {
  await supabaseAdminRequest<null>(
    `/rest/v1/push_subscriptions${buildQuery({
      id: `eq.${subscriptionId}`,
    })}`,
    {
      method: 'DELETE',
    }
  );
}
