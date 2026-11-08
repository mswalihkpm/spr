import { getSupabaseAdminClient } from '../src/lib/supabase-storage';

async function main() {
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets, error);
}

main().catch(console.error);

