import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import mysql from 'mysql2/promise';

const executeFile = promisify(execFile);
const seedFiles = ['server/database/seeds/001_seed_roles_permissions.sql', 'server/database/seeds/002_seed_example_recipe.sql'];

function requiredEnvironmentValue(name) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required for Playwright database setup`);
	}

	return value;
}

export function getTestDatabaseName() {
	const databaseName = requiredEnvironmentValue('DB_NAME');

	if (!/^[a-zA-Z0-9_]+_playwright(?:_ssr)?$/u.test(databaseName)) {
		throw new Error(`Refusing to use unsafe Playwright database name: ${databaseName}`);
	}

	return databaseName;
}

function connectionOptions(includeDatabase = true) {
	return {
		host: requiredEnvironmentValue('DB_HOST'),
		port: Number(process.env.DB_PORT ?? 3306),
		user: requiredEnvironmentValue('DB_USER'),
		password: requiredEnvironmentValue('DB_PASSWORD'),
		timezone: 'Z',
		...(includeDatabase ? { database: getTestDatabaseName() } : {}),
	};
}

export async function rebuildTestDatabase() {
	const databaseName = getTestDatabaseName();
	const adminConnection = await mysql.createConnection({
		...connectionOptions(false),
		multipleStatements: true,
	});

	try {
		await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
		await adminConnection.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
	} finally {
		await adminConnection.end();
	}

	await executeFile(process.execPath, ['scripts/database/run-dbmate.js', 'migrate'], {
		cwd: process.cwd(),
		env: process.env,
	});

	await applyTestDatabaseSeeds();
}

export async function applyTestDatabaseSeeds() {
	const seedConnection = await mysql.createConnection({
		...connectionOptions(),
		multipleStatements: true,
	});

	try {
		for (const relativeFile of seedFiles) {
			const sql = await fs.readFile(path.resolve(relativeFile), 'utf8');

			await seedConnection.query(sql);
		}
	} finally {
		await seedConnection.end();
	}
}

export function createTestDatabaseConnection() {
	return mysql.createConnection(connectionOptions());
}

export async function seedPublishedRecipeFixture() {
	const database = await createTestDatabaseConnection();

	try {
		const [user] = await database.execute(
			`INSERT INTO users (email, display_name, status, email_verified_at)
			 VALUES ('public-recipe@example.com', 'Maria Natal', 'active', CURRENT_TIMESTAMP(3))`,
		);
		const [author] = await database.execute('INSERT INTO authors (user_id, display_name) VALUES (?, ?)', [user.insertId, 'Maria Natal']);
		const [post] = await database.execute(
			`INSERT INTO posts (owner_user_id, author_id, content_type, status, visibility, published_at)
			 VALUES (?, ?, 'recipe', 'published', 'public', '2026-08-05 00:00:00.000')`,
			[user.insertId, author.insertId],
		);
		const source = {
			cookMinutes: 12,
			description: 'Bolachas simples para celebrar o Natal.',
			difficulty: 'easy',
			ingredients: [{ id: 'farinha', name: 'farinha', quantity: '200', unit: 'g' }],
			instructions: [{ id: 'misturar', text: 'Misture todos os ingredientes.', title: 'Misturar' }],
			kind: 'recipe',
			prepMinutes: 20,
			schemaVersion: 1,
			title: 'Bolachas de Natal',
			yield: { quantity: 16, unit: 'bolachas' },
		};
		const [revision] = await database.execute(
			`INSERT INTO post_revisions (
				post_id, revision_number, created_by_user_id, title, excerpt,
				seo_title, seo_description, layout_key, template_key, header_key, footer_key,
				region_config, source, source_schema_version, render_version, plain_text, source_sha256
			 ) VALUES (?, 1, ?, ?, ?, ?, ?, 'full-width', 'recipe', 'minimal', 'standard', ?, ?, 1, 1, ?, ?)`,
			[
				post.insertId,
				user.insertId,
				source.title,
				source.description,
				'Bolachas de Natal | O Melhor do Natal',
				source.description,
				JSON.stringify({ sidebar: [] }),
				JSON.stringify(source),
				source.title,
				Buffer.alloc(32, 9),
			],
		);

		await database.execute('INSERT INTO post_revision_heads (post_id, current_revision_id, published_revision_id) VALUES (?, ?, ?)', [
			post.insertId,
			revision.insertId,
			revision.insertId,
		]);
		await database.execute(
			`INSERT INTO route_slugs (resource_type, resource_id, slug, kind)
			 VALUES ('post', ?, 'bolachas-de-natal', 'canonical'), ('post', ?, 'bolachas-antigas', 'redirect')`,
			[post.insertId, post.insertId],
		);

		for (let index = 1; index <= 12; index += 1) {
			const fixtureSource = {
				...source,
				description: `Receita de arquivo número ${index}.`,
				title: `Receita de arquivo ${index}`,
			};
			const [fixturePost] = await database.execute(
				`INSERT INTO posts (owner_user_id, author_id, content_type, status, visibility, published_at)
				 VALUES (?, ?, 'recipe', 'published', 'public', '2026-08-04 00:00:00.000')`,
				[user.insertId, author.insertId],
			);
			const [fixtureRevision] = await database.execute(
				`INSERT INTO post_revisions (
					post_id, revision_number, created_by_user_id, title, excerpt,
					layout_key, template_key, header_key, footer_key, region_config,
					source, source_schema_version, render_version, plain_text, source_sha256
				 ) VALUES (?, 1, ?, ?, ?, 'full-width', 'recipe', 'minimal', 'standard', ?, ?, 1, 1, ?, ?)`,
				[
					fixturePost.insertId,
					user.insertId,
					fixtureSource.title,
					fixtureSource.description,
					JSON.stringify({ sidebar: [] }),
					JSON.stringify(fixtureSource),
					fixtureSource.title,
					Buffer.alloc(32, index + 20),
				],
			);

			await database.execute('INSERT INTO post_revision_heads (post_id, current_revision_id, published_revision_id) VALUES (?, ?, ?)', [
				fixturePost.insertId,
				fixtureRevision.insertId,
				fixtureRevision.insertId,
			]);
			await database.execute(
				`INSERT INTO route_slugs (resource_type, resource_id, slug, kind)
				 VALUES ('post', ?, ?, 'canonical')`,
				[fixturePost.insertId, `receita-de-arquivo-${index}`],
			);
		}
	} finally {
		await database.end();
	}
}

export function createTestDatabasePool() {
	return mysql.createPool({
		...connectionOptions(),
		waitForConnections: true,
		connectionLimit: 4,
		queueLimit: 0,
	});
}
