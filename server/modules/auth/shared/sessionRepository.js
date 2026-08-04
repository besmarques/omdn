export default function createSessionRepository(db) {
	async function deleteUserSessions(userId, executor = db) {
		const [result] = await executor.execute(
			`
			DELETE FROM sessions
			WHERE JSON_VALID(data) = 1
				AND CAST(
					JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))
					AS UNSIGNED
				) = ?
		`,
			[userId],
		);

		return result.affectedRows;
	}

	async function deleteOtherUserSessions(userId, currentSessionId, executor = db) {
		const [result] = await executor.execute(
			`
			DELETE FROM sessions
			WHERE session_id <> ?
				AND JSON_VALID(data) = 1
				AND CAST(
					JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))
					AS UNSIGNED
				) = ?
		`,
			[currentSessionId, userId],
		);

		return result.affectedRows;
	}

	return {
		deleteUserSessions,
		deleteOtherUserSessions,
	};
}
