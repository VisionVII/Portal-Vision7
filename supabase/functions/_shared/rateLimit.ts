// @ts-nocheck
// deno-lint-ignore-file
// Persistent rate limiting shared by n8n-proxy, n8n-settings and
// n8n-workflow-import. Backed by automation_rate_limit_log so the count
// survives cold starts and is shared across Edge Function instances —
// unlike an in-memory Map, which resets per isolate.

export async function checkRateLimit(
  supabaseAdmin: any,
  userId: string,
  functionName: string,
  maxPerHour: number,
): Promise<{ limited: boolean; count: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from('automation_rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('created_at', oneHourAgo);

  if (error) {
    // Fail open: a broken rate-limit check must not take the feature down.
    console.error(`[rateLimit] count query failed for ${functionName}`, error);
    return { limited: false, count: 0 };
  }

  const current = count ?? 0;
  if (current >= maxPerHour) {
    return { limited: true, count: current };
  }

  await supabaseAdmin.from('automation_rate_limit_log').insert({
    user_id: userId,
    function_name: functionName,
  });

  // Best-effort cleanup so the table doesn't grow unbounded — no cron needed.
  void supabaseAdmin
    .from('automation_rate_limit_log')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return { limited: false, count: current + 1 };
}
