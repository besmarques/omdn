import { verify } from 'otplib';

import {
	decryptTotpSecret,
} from '#server/modules/auth/totp/utils/totpEncryption';

import {
	hashRecoveryCode,
} from '#server/modules/auth/totp/utils/recoveryCodes';

function isTotpCode(code) {
	return /^\d{6}$/.test(code);
}

export default function createVerifyTotpLoginService(
	authRepository,
) {
	async function verifyTotpCode({
		userId,
		code,
		totp,
		connection,
	}) {
		const secret = decryptTotpSecret(
			totp.secret_encrypted,
			userId,
		);

		const options = {
			secret,
			token: code,
			algorithm: String(
				totp.algorithm,
			).toLowerCase(),
			digits: Number(totp.digits),
			period: Number(totp.period),
			epochTolerance: Number(totp.period),
		};

		const lastUsedStep = Number(
			totp.last_used_step,
		);

		if (
			Number.isSafeInteger(lastUsedStep) &&
			lastUsedStep >= 0
		) {
			options.afterTimeStep = lastUsedStep;
		}

		const verification = await verify(options);

		if (!verification.valid) {
			return false;
		}

		const affectedRows =
			await authRepository.updateTotpLastUsedStep(
				userId,
				verification.timeStep,
				connection,
			);

		return affectedRows === 1;
	}

	async function verifyRecoveryCode({
		userId,
		code,
		connection,
	}) {
		const codeHash = hashRecoveryCode(code);

		const recoveryCode =
			await authRepository.findUnusedRecoveryCodeForUpdate(
				userId,
				codeHash,
				connection,
			);

		if (!recoveryCode) {
			return false;
		}

		const affectedRows =
			await authRepository.markRecoveryCodeUsed(
				recoveryCode.id,
				connection,
			);

		return affectedRows === 1;
	}

	async function verifySecondFactor({
		userId,
		code,
	}) {
		return authRepository.withConnection(
			async (connection) => {
				try {
					await connection.beginTransaction();

					const totp =
						await authRepository.findTotpByUserIdForUpdate(
							userId,
							connection,
						);

					if (!totp?.is_enabled) {
						await connection.rollback();

						return {
							verified: false,
						};
					}

					const method = isTotpCode(code)
						? 'totp'
						: 'recovery_code';

					const verified =
						method === 'totp'
							? await verifyTotpCode({
									userId,
									code,
									totp,
									connection,
								})
							: await verifyRecoveryCode({
									userId,
									code,
									connection,
								});

					if (!verified) {
						await connection.rollback();

						return {
							verified: false,
						};
					}

					const user =
						await authRepository.findActiveUserById(
							userId,
							connection,
						);

					if (!user) {
						await connection.rollback();

						return {
							verified: false,
						};
					}

					await connection.commit();

					return {
						verified: true,
						method,
						user,
					};
				} catch (error) {
					await connection.rollback();

					throw error;
				}
			},
		);
	}

	async function recordSuccessfulLogin(userId) {
		await authRepository.updateLastLogin(userId);
	}

	return {
		verifySecondFactor,
		recordSuccessfulLogin,
	};
}