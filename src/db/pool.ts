import { Pool } from 'pg';
import { getSecrets, SECRET_KEYS } from '../services/secrets';

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = getSecrets().get(SECRET_KEYS.DATABASE_URL);
    _pool = new Pool({ connectionString: databaseUrl });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
