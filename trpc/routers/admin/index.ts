import { createTRPCRouter } from "@/trpc/init";
import { adminOrganizationRouter } from "@/trpc/routers/admin/admin-organization-router";
import { adminPhysicalCardRouter } from "@/trpc/routers/admin/admin-physical-card-router";
import { adminUserRouter } from "@/trpc/routers/admin/admin-user-router";

export const adminRouter = createTRPCRouter({
	organization: adminOrganizationRouter,
	physicalCard: adminPhysicalCardRouter,
	user: adminUserRouter,
});
