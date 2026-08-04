export default function SidebarLayout({ children, footer, header, sidebar }) {
	return (
		<>
			{header}
			<div>
				<main>{children}</main>
				<aside aria-label="Related content">{sidebar}</aside>
			</div>
			{footer}
		</>
	);
}
