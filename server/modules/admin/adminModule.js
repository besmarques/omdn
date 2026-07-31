import createAdminRoutes from '#server/modules/admin/adminRoutes';
import createTestAdminAccessController from '#server/modules/admin/testAccess/testAdminAccessController';
import createTestAdminAccessService from '#server/modules/admin/testAccess/testAdminAccessService';

export default function createAdminModule() {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController = createTestAdminAccessController(testAdminAccessService);

	return createAdminRoutes({
		testAdminAccessController,
	});
}
