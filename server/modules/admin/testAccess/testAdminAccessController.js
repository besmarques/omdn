export default function createTestAdminAccessController(
	testAdminAccessService,
) {
	return function testAdminAccess(req, res) {
		return res.json(testAdminAccessService());
	};
}
