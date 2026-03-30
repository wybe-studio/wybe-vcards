import type * as React from "react";
import {
	Alert,
	AlertDescription,
	type AlertProps,
	AlertTitle,
} from "@/components/ui/alert";

export type OrganizationInvitationAlertProps = Omit<AlertProps, "variant"> & {
	organizationName?: string;
};

export function OrganizationInvitationAlert({
	organizationName,
	...props
}: OrganizationInvitationAlertProps): React.JSX.Element {
	return (
		<Alert variant="info" {...props}>
			<AlertTitle>
				{organizationName
					? `Sei stato invitato a unirti a ${organizationName}.`
					: "Sei stato invitato a unirti a un'organizzazione."}
			</AlertTitle>
			<AlertDescription>
				{organizationName
					? "Registrati o accedi per accettare l'invito."
					: "Devi accedere o creare un account per unirti all'organizzazione."}
			</AlertDescription>
		</Alert>
	);
}
