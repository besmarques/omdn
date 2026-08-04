import { rebuildTestDatabase } from './database.js';

await rebuildTestDatabase();
await import('../../server/server.js');
