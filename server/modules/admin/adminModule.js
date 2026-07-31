import createAdminRoutes from '#server/modules/admin/adminRoutes';
import createTestAdminAccessController from '#server/modules/admin/controllers/testAdminAccessController';
import createTestAdminAccessService from '#server/modules/admin/services/testAdminAccessService';

export default function createAdminModule() {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController =
		createTestAdminAccessController(
			testAdminAccessService,
		);

	return createAdminRoutes({
		testAdminAccessController,
	});
}