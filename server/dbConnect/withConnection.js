export default function createWithConnection(db) {
	return async function withConnection(callback) {
		const connection = await db.getConnection();

		try {
			return await callback(connection);
		} finally {
			connection.release();
		}
	};
}
