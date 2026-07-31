export default function createLogoutService() {
	return function logout(session) {
		if (!session) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			session.destroy((error) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
	};
}
