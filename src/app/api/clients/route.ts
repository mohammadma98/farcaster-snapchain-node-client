import { NextResponse } from 'next/server';
import { isPostgresAvailable } from '@/lib/db/pool';
import { initDatabaseSchema } from '@/lib/db/schema';
import { KnownClientRepository } from '@/lib/db/repositories';
import { KNOWN_CLIENTS } from '@/lib/farcaster/attribution';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hasDb = await isPostgresAvailable();
    if (hasDb) {
      await initDatabaseSchema().catch(() => {});
      const clients = await KnownClientRepository.getAllClients();
      if (clients.length > 0) {
        return NextResponse.json({
          status: 'ok',
          clients,
          storage: 'postgres',
        });
      }
    }

    // Static fallback from KNOWN_CLIENTS constant
    const fallbackClients = Object.values(KNOWN_CLIENTS);
    return NextResponse.json({
      status: 'ok',
      clients: fallbackClients,
      storage: 'memory',
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
