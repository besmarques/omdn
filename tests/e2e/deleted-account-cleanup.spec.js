import { expect, test } from '@playwright/test';

import createDeletedAccountCleanupRepository from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupRepository';

import { createTestDatabasePool } from './database.js';

test('purges an expired deleted user who owns content', async () => {
	const database = createTestDatabasePool();

	let userId;
	let authorId;
	let postId;

	try {
		const [userResult] = await database.execute(
			`INSERT INTO users (
				email,
				display_name,
				status,
				email_verified_at,
				deleted_at
			) VALUES (
				?,
				?,
				'deleted',
				CURRENT_TIMESTAMP(3),
				'2000-01-01 00:00:00.000'
			)`,
			[
				'deleted-content-owner@example.com',
				'Deleted Content Owner',
			],
		);

		userId = userResult.insertId;

		const [authorResult] = await database.execute(
			`INSERT INTO authors (
				user_id,
				display_name
			) VALUES (?, ?)`,
			[
				userId,
				'Deleted Content Owner',
			],
		);

		authorId = authorResult.insertId;

		const [postResult] = await database.execute(
			`INSERT INTO posts (
				owner_user_id,
				author_id,
				content_type,
				status,
				visibility,
				trashed_at
			) VALUES (
				?,
				?,
				'recipe',
				'trashed',
				'private',
				'2000-01-01 00:00:00.000'
			)`,
			[
				userId,
				authorId,
			],
		);

		postId = postResult.insertId;

		const repository =
			createDeletedAccountCleanupRepository(database);

		await expect(
			repository.purgeExpiredDeletedUsers(1),
		).resolves.toBe(1);

		const [[remainingUser]] = await database.execute(
			`SELECT COUNT(*) AS total
			 FROM users
			 WHERE id = ?`,
			[userId],
		);

		const [[remainingAuthor]] = await database.execute(
			`SELECT COUNT(*) AS total
			 FROM authors
			 WHERE id = ?`,
			[authorId],
		);

		const [[remainingPost]] = await database.execute(
			`SELECT COUNT(*) AS total
			 FROM posts
			 WHERE id = ?`,
			[postId],
		);

		expect(Number(remainingUser.total)).toBe(0);
		expect(Number(remainingAuthor.total)).toBe(0);
		expect(Number(remainingPost.total)).toBe(0);
	} finally {
		if (postId) {
			await database.execute(
				`DELETE FROM posts WHERE id = ?`,
				[postId],
			);
		}

		if (authorId) {
			await database.execute(
				`DELETE FROM authors WHERE id = ?`,
				[authorId],
			);
		}

		if (userId) {
			await database.execute(
				`DELETE FROM users WHERE id = ?`,
				[userId],
			);
		}

		await database.end();
	}
});
