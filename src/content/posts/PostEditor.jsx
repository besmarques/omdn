import FormFeedback from '../../components/forms/FormFeedback';
import { Button } from '../../components/ui/button';

export default function PostEditor({
	children,
	errors,
	message,
	onSubmit,
	ready = true,
	sidebar,
	submitLabel,
	submitting,
	title,
}) {
	return (
		<main className="min-w-0 p-6">
			<h1 className="mb-6 text-4xl font-bold">{title}</h1>

			<form
				className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)]"
				inert={!ready}
				onSubmit={onSubmit}
			>
				<section className="grid min-w-0 gap-4">
					{children}
				</section>

				<aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-6 xl:self-start">
					{sidebar}

					<Button type="submit" disabled={!ready || submitting}>
						{submitting ? `${submitLabel}…` : submitLabel}
					</Button>

					<FormFeedback
						errors={errors}
						message={message}
						tone={Object.keys(errors).length > 0 ? 'destructive' : 'default'}
					/>
				</aside>
			</form>
		</main>
	);
}
