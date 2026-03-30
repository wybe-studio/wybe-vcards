# tRPC Procedure Examples

Real patterns from this project's codebase.

> **Nota**: Gli esempi usano il modulo **Lead** come riferimento. Lead è un'implementazione CRUD completa inclusa nel kit come esempio — mostra i pattern per aggiungere nuove feature org-scoped (schema, router, UI). Non sarà presente in tutti i progetti derivati dal kit. Quando crei una nuova feature, segui gli stessi pattern sostituendo "lead" con il tuo dominio.

## Organization Lead CRUD

Location: `trpc/routers/organization/lead-router.ts`

### List with Filtering and Sorting

```typescript
list: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(
    z.object({
      search: z.string().optional(),
      status: z.nativeEnum(LeadStatus).optional(),
      source: z.nativeEnum(LeadSource).optional(),
      sortBy: z.enum(["created_at", "first_name", "status", "estimated_value"]).default("created_at"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      limit: z.number().min(1).max(100).default(25),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    let query = ctx.supabase
      .from("lead")
      .select("*", { count: "exact" })
      .eq("organization_id", ctx.organization.id);

    if (input.search) {
      query = query.or(
        `first_name.ilike.%${input.search}%,last_name.ilike.%${input.search}%,email.ilike.%${input.search}%,company.ilike.%${input.search}%`
      );
    }

    if (input.status) {
      query = query.eq("status", input.status);
    }

    if (input.source) {
      query = query.eq("source", input.source);
    }

    const { data, error, count } = await query
      .order(input.sortBy, { ascending: input.sortOrder === "asc" })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      logger.error({ error }, "Failed to list leads");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    return { data: data ?? [], total: count ?? 0 };
  }),
```

### Create with camelCase → snake_case Mapping

```typescript
create: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(createLeadSchema)
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from("lead")
      .insert({
        organization_id: ctx.organization.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company,
        job_title: input.jobTitle,
        status: input.status,
        source: input.source,
        estimated_value: input.estimatedValue,
        notes: input.notes,
        assigned_to_id: input.assignedToId,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Failed to create lead");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    logger.info({ leadId: data.id, userId: ctx.user.id }, "Lead created");
    return data;
  }),
```

### Bulk Delete

```typescript
bulkDelete: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { error } = await ctx.supabase
      .from("lead")
      .delete()
      .in("id", input.ids)
      .eq("organization_id", ctx.organization.id);

    if (error) {
      logger.error({ error }, "Failed to bulk delete leads");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    logger.info(
      { count: input.ids.length, userId: ctx.user.id },
      "Leads bulk deleted"
    );

    return { deleted: input.ids.length };
  }),
```

## Admin Procedure Example

Location: `trpc/routers/admin/`

```typescript
listUsers: protectedAdminProcedure
  .input(
    z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(25),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    let query = ctx.supabase
      .from("user_profile")
      .select("*", { count: "exact" });

    if (input.search) {
      query = query.ilike("username", `%${input.search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      logger.error({ error }, "Failed to list users");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    return { data: data ?? [], total: count ?? 0 };
  }),
```

## Export Procedure (CSV/Excel)

```typescript
export: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(z.object({ format: z.enum(["csv", "excel"]) }))
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from("lead")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error }, "Failed to export leads");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Map to export format
    const rows = (data ?? []).map((lead) => ({
      Nome: lead.first_name,
      Cognome: lead.last_name,
      Email: lead.email,
      Telefono: lead.phone ?? "",
      Azienda: lead.company ?? "",
      Stato: lead.status,
      Fonte: lead.source,
      "Valore stimato": lead.estimated_value ?? "",
    }));

    return rows;
  }),
```

## Lazy-Loaded Router Registration

Location: `trpc/routers/app.ts`

```typescript
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => "ok"),
  user: lazy(() => import("./user")),
  organization: lazy(() => import("./organization")),
  admin: lazy(() => import("./admin")),
  billing: lazy(() => import("./billing")),
});

export type AppRouter = typeof appRouter;
```
