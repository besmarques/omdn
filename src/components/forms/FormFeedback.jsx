import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function FormFeedback({ errors = {}, message, tone = 'default' }) {
	const fieldErrors = Object.values(errors).flat();

	if (!message && fieldErrors.length === 0) return null;

	return (
		<Alert role={tone === 'destructive' || fieldErrors.length > 0 ? 'alert' : 'status'} variant={tone}>
			{message && <AlertTitle>{message}</AlertTitle>}
			{fieldErrors.length > 0 && (
				<AlertDescription>
					<ul className="list-disc pl-4">
						{fieldErrors.map((error, index) => (
							<li key={`${error}-${index}`}>{error}</li>
						))}
					</ul>
				</AlertDescription>
			)}
		</Alert>
	);
}
