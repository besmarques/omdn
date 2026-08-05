import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';

import { disableTotp, enableTotp, regenerateTotpRecoveryCodes, setupTotp } from '@/api/authApi';
import { accountSecurityQueryKeys, useTotpStatus } from '@/query/accountSecurityQuery';
import { useCurrentAccount } from '@/query/currentAccountQuery';

export default function AccountSecurityPage() {
	const { data: account } = useCurrentAccount();
	const queryClient = useQueryClient();
	const { data: totpStatus, error: statusError, isPending: statusPending } = useTotpStatus();
	const enabled = totpStatus?.enabled ?? null;
	const [setup, setSetup] = useState(null);
	const [setupCode, setSetupCode] = useState('');
	const [regenerationCode, setRegenerationCode] = useState('');
	const [disableCode, setDisableCode] = useState('');
	const [password, setPassword] = useState('');
	const [recoveryCodes, setRecoveryCodes] = useState([]);
	const [message, setMessage] = useState('');
	const setupMutation = useMutation({ mutationFn: setupTotp, gcTime: 0 });
	const enableMutation = useMutation({ mutationFn: enableTotp, gcTime: 0 });
	const regenerateMutation = useMutation({ mutationFn: regenerateTotpRecoveryCodes, gcTime: 0 });
	const disableMutation = useMutation({ mutationFn: disableTotp, gcTime: 0 });
	const submitting = [setupMutation, enableMutation, regenerateMutation, disableMutation].some((mutation) => mutation.isPending);
	const authenticated = Boolean(account?.authenticated);

	async function runAction(mutation, variables, onResult) {
		setMessage('');

		try {
			await onResult(await mutation.mutateAsync(variables));
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			mutation.reset();
		}
	}

	function handleStartSetup() {
		void runAction(setupMutation, undefined, async (result) => {
			if (!result.ok) {
				setMessage(result.body?.message ?? 'Unable to start two-factor authentication setup');
				return;
			}

			setSetup(result.body.data);
			setRecoveryCodes([]);
			setMessage(result.body?.message ?? 'Scan the QR code and confirm your code');
		});
	}

	function handleEnable(event) {
		event.preventDefault();
		void runAction(enableMutation, setupCode, async (result) => {
			if (!result.ok) {
				setMessage(result.body?.message ?? 'Unable to enable two-factor authentication');
				return;
			}

			queryClient.setQueryData(accountSecurityQueryKeys.totp, { enabled: true });
			setSetup(null);
			setSetupCode('');
			setRecoveryCodes(result.body?.data?.recoveryCodes ?? []);
			setMessage('Two-factor authentication enabled. Save the recovery codes now.');
		});
	}

	function handleRegenerate(event) {
		event.preventDefault();
		void runAction(regenerateMutation, regenerationCode, async (result) => {
			if (!result.ok) {
				setMessage(result.body?.message ?? 'Unable to regenerate recovery codes');
				return;
			}

			setRegenerationCode('');
			setRecoveryCodes(result.body?.data?.recoveryCodes ?? []);
			await queryClient.invalidateQueries({ queryKey: accountSecurityQueryKeys.all });
			setMessage('Recovery codes regenerated. Previous recovery codes no longer work.');
		});
	}

	function handleDisable(event) {
		event.preventDefault();
		void runAction(disableMutation, { code: disableCode, password }, async (result) => {
			if (!result.ok) {
				setMessage(result.body?.message ?? 'Unable to disable two-factor authentication');
				return;
			}

			queryClient.setQueryData(accountSecurityQueryKeys.totp, { enabled: false });
			setDisableCode('');
			setPassword('');
			setRecoveryCodes([]);
			setMessage('Two-factor authentication disabled.');
		});
	}

	if (!authenticated) {
		return (
			<main>
				<h1>Account security</h1>
				<p>Authentication is ending...</p>
			</main>
		);
	}

	return (
		<main>
			<h1>Account security</h1>
			<p>Signed in as {account.user.email}</p>
			<p>Two-factor authentication: {statusPending ? 'Loading' : enabled ? 'Enabled' : 'Disabled'}</p>
			{statusError && <p role="alert">{statusError.message}</p>}

			{enabled === false && !setup && (
				<button type="button" disabled={submitting} onClick={handleStartSetup}>
					Set up authenticator
				</button>
			)}

			{setup && (
				<section>
					<h2>Set up authenticator</h2>
					<img src={setup.qrCode} alt="Authenticator setup QR code" />
					<p>Manual setup key: {setup.secret}</p>
					<form onSubmit={handleEnable}>
						<label htmlFor="setup-code">Authenticator code</label>
						<input
							id="setup-code"
							type="text"
							autoComplete="one-time-code"
							required
							value={setupCode}
							onChange={(event) => setSetupCode(event.target.value)}
						/>
						<button type="submit" disabled={submitting}>
							Confirm and enable
						</button>
					</form>
				</section>
			)}

			{recoveryCodes.length > 0 && (
				<section>
					<h2>Recovery codes</h2>
					<p>Store these somewhere safe. Each code can be used only once.</p>
					<ul>
						{recoveryCodes.map((recoveryCode) => (
							<li key={recoveryCode}>
								<code>{recoveryCode}</code>
							</li>
						))}
					</ul>
				</section>
			)}

			{enabled && (
				<>
					<section>
						<h2>Replace recovery codes</h2>
						<form onSubmit={handleRegenerate}>
							<label htmlFor="regenerate-code">Current authenticator code</label>
							<input
								id="regenerate-code"
								type="text"
								required
								value={regenerationCode}
								onChange={(event) => setRegenerationCode(event.target.value)}
							/>
							<button type="submit" disabled={submitting}>
								Generate new recovery codes
							</button>
						</form>
					</section>

					<section>
						<h2>Disable two-factor authentication</h2>
						<form onSubmit={handleDisable}>
							<label htmlFor="disable-password">Current password</label>
							<input
								id="disable-password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
							<label htmlFor="disable-code">Authenticator or recovery code</label>
							<input id="disable-code" type="text" required value={disableCode} onChange={(event) => setDisableCode(event.target.value)} />
							<button type="submit" disabled={submitting}>
								Disable two-factor authentication
							</button>
						</form>
					</section>
				</>
			)}

			{message && <p>{message}</p>}
			<p>
				<Link to={account.permissions.includes('users.manage') ? '/admin' : '/'}>Back</Link>
			</p>
		</main>
	);
}
