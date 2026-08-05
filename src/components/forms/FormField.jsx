import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';

export default function FormField({ children, description, errors = [], label, name }) {
	const normalizedErrors = errors.map((error) => (typeof error === 'string' ? { message: error } : error));

	return (
		<Field data-invalid={normalizedErrors.length > 0 || undefined}>
			<FieldLabel htmlFor={name}>{label}</FieldLabel>
			{children}
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={normalizedErrors} />
		</Field>
	);
}
