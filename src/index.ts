import * as dotenv from 'dotenv';
import { initSecrets } from './services/secrets';

dotenv.config();

function main(): void {
  // Initialize secrets client. In local dev, env vars are read directly.
  // In production, replace with a real secrets manager client.
  initSecrets();

  console.log('Nigeria History Pipeline — started.');
  console.log('No pipeline stages are active yet. Implement modules and wire them here.');
}

main();
