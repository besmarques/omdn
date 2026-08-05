import { describe, expect, it } from 'vitest';

import { createDatabaseUrl, findOutOfOrderMigration, quoteMysqlIdentifier, readDatabaseConfig } from './run-dbmate';

describe('dbmate configuration', () => {
	it('builds an encoded MySQL URL without changing database settings', () => {
		expect(
			createDatabaseUrl({
				database: 'omdn_test',
				host: '127.0.0.1',
				password: 'p@ss:/word',
				port: 3306,
				user: 'omdn user',
			}),
		).toBe('mysql://omdn%20user:p%40ss%3A%2Fword@127.0.0.1:3306/omdn_test');
	});

	it('reads the existing split database environment contract', () => {
		expect(
			readDatabaseConfig({
				DB_HOST: 'localhost',
				DB_NAME: 'omdn',
				DB_PASSWORD: 'secret',
				DB_PORT: '3307',
				DB_USER: 'omdn_user',
			}),
		).toEqual({
			database: 'omdn',
			host: 'localhost',
			password: 'secret',
			port: 3307,
			user: 'omdn_user',
		});
	});

	it('rejects a pending migration older than an applied version', () => {
		expect(findOutOfOrderMigration(['001_first.sql', '002_second.sql', '003_third.sql'], ['001', '003'])).toBe('002');
		expect(findOutOfOrderMigration(['001_first.sql', '002_second.sql', '003_third.sql'], ['001', '002'])).toBeUndefined();
	});

	it('quotes an explicitly configured MySQL database identifier', () => {
		expect(quoteMysqlIdentifier('omdn')).toBe('`omdn`');
		expect(quoteMysqlIdentifier('omdn`test')).toBe('`omdn``test`');
	});
});
