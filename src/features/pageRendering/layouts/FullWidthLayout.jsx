export default function FullWidthLayout({ children, footer, header }) {
	return (
		<>
			{header}
			<main>{children}</main>
			{footer}
		</>
	);
}
