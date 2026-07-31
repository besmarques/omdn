export default function createGetCurrentAccountService() {
	return function getCurrentAccount(auth) {
		return {
			user: auth.user,
			roles: auth.roles,
			permissions: auth.permissions,
		};
	};
}
