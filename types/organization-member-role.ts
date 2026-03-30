import type { Organization } from "@/types/organization";

export type OrganizationMemberRole = NonNullable<
	Organization["members"]
>[number]["role"];
