export default function createTestAdminAccessService() {
	return function testAdminAccess() {
		return {
			status: true,
			message: 'You have access to this admin route',
		};
	};
}
