import FormFeedback from '../../components/forms/FormFeedback';
import { Button } from '../../components/ui/button';

export default function PostEditor({ children, errors, message, onSubmit, ready = true, submitLabel, submitting, title }) {
	return (
		<main className="mx-auto max-w-3xl p-6">
			<h1 className="text-4xl font-bold">{title}</h1>
			<form className="grid gap-4" inert={!ready} onSubmit={onSubmit}>
				{children}
				<Button type="submit" disabled={!ready || submitting}>
					{submitting ? `${submitLabel}…` : submitLabel}
				</Button>
			</form>
			<FormFeedback errors={errors} message={message} tone={Object.keys(errors).length > 0 ? 'destructive' : 'default'} />
		</main>
	);
}
