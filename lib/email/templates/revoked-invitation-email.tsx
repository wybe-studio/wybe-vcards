import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import type * as React from "react";

export type RevokedInvitationEmailProps = {
	appName: string;
	organizationName: string;
};

function RevokedInvitationEmail({
	appName,
	organizationName,
}: RevokedInvitationEmailProps): React.JSX.Element {
	return (
		<Html>
			<Head />
			<Preview>
				Invito per {organizationName} su {appName} revocato
			</Preview>
			<Tailwind>
				<Body className="m-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded-sm border border-[#eaeaea] border-solid p-[20px]">
						<Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
							Invito per <strong>{organizationName}</strong> su{" "}
							<strong>{appName}</strong> revocato
						</Heading>
						<Text className="text-[14px] text-black leading-[24px]">Ciao,</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Il tuo invito a unirti a <strong>{organizationName}</strong> è
							stato revocato.
						</Text>
						<Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
						<Text className="text-[#666666] text-[12px] leading-[24px]">
							Se la revoca è stata inaspettata, chiedi a un amministratore
							dell'organizzazione di inviarti un nuovo link di invito.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

RevokedInvitationEmail.PreviewProps = {
	appName: "Acme",
	organizationName: "Evil Corp",
} satisfies RevokedInvitationEmailProps;

export default RevokedInvitationEmail;
export { RevokedInvitationEmail };
