import { Toaster } from "sonner";

export default function VcardPublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			{children}
			<Toaster />
		</>
	);
}
