import argon2 from 'argon2';
import { verify } from 'otplib';

import {
	decryptTotpSecret,
} from '#server/modules/auth/totp/shared/totpEncryption';

import {
	hashRecoveryCode,
} from '#server/modules/auth/totp/shared/recoveryCodes';

function isTotpCode(code) {
	return /^\d{6}$/.test(code);
}

export default function createDisableTotpService(
	authRepository,
) {
	async function verifyTotpCode({
		userId,
		code,
		totp,
	}) {
		const secret = decryptTotpSecret(
			totp.secret_encrypted,
			userId,
		);

		const verificationOptions = {
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
			verificationOptions.afterTimeStep =
				lastUsedStep;
		}

		const verification = await verify(
			verificationOptions,
		);

		return Boolean(verification.valid);
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

		return Boolean(recoveryCode);
	}

	return async function disableTotp({
		userId,
		password,
		code,
		currentSessionId,
	}) {
		if (!currentSessionId) {
			throw new Error(
				'Current session identifier is unavailable',
			);
		}

		return authRepository.withConnection(
			async (connection) => {
				try {
					await connection.beginTransaction();

					const user =
						await authRepository.findActiveUserPasswordByIdForUpdate(
							userId,
							connection,
						);

					if (!user?.password_hash) {
						await connection.rollback();

						return {
							disabled: false,
						};
					}

					const passwordIsValid =
						await argon2.verify(
							user.password_hash,
							password,
						);

					if (!passwordIsValid) {
						await connection.rollback();

						return {
							disabled: false,
						};
					}

					const totp =
						await authRepository.findTotpByUserIdForUpdate(
							userId,
							connection,
						);

					if (!totp?.is_enabled) {
						await connection.rollback();

						return {
							disabled: false,
						};
					}

					const authenticationIsValid =
						isTotpCode(code)
							? await verifyTotpCode({
									userId,
									code,
									totp,
								})
							: await verifyRecoveryCode({
									userId,
									code,
									connection,
								});

					if (!authenticationIsValid) {
						await connection.rollback();

						return {
							disabled: false,
						};
					}

					await authRepository.deleteRecoveryCodes(
						userId,
						connection,
					);

					const deletedTotpRows =
						await authRepository.deleteTotp(
							userId,
							connection,
						);

					if (deletedTotpRows !== 1) {
						throw new Error(
							'Unable to disable TOTP',
						);
					}

					await authRepository.deleteOtherUserSessions(
						userId,
						currentSessionId,
						connection,
					);

					await connection.commit();

					return {
						disabled: true,
					};
				} catch (error) {
					await connection.rollback();

					throw error;
				}
			},
		);
	};
}