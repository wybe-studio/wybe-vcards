# Admin vCard/Physical Card Actions + 2FA Obbligatorio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CRUD actions to admin vCard/physical card tables and enforce 2FA for all platform admins.

**Architecture:** New admin tRPC mutations using `adminClient` (bypasses RLS) with explicit org-ownership validation. Inline action icons on table rows. 2FA enforcement at two levels: middleware redirect in `proxy.ts` + tRPC guard in `protectedAdminProcedure`.

**Tech Stack:** tRPC v11, Supabase Auth MFA, Zod, NiceModal, Lucide React icons, Shadcn UI

---

## Task 1: Add Zod schemas for admin vCard and physical card mutations

**Files:**
- Modify: `schemas/admin-vcard-schemas.ts`

- [ ] **Step 1: Add the new admin schemas**

Add these schemas to the existing file after line 26:

```typescript
export const adminUpdateVcardSchema = z.object({
	organizationId: z.string().uuid(),
	vcardId: z.string().uuid(),
	first_name: z.string().trim().min(1).max(100).optional(),
	last_name: z.string().trim().min(1).max(100).optional(),
	email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
	phone: z.string().trim().max(50).nullable().optional(),
	job_title: z.string().trim().max(200).nullable().optional(),
	slug: z.string().trim().min(1).max(200).optional(),
	status: z.enum(["active", "suspended", "archived"]).optional(),
	user_id: z.string().uuid().nullable().optional(),
});

export const adminDeleteVcardSchema = z.object({
	organizationId: z.string().uuid(),
	vcardId: z.string().uuid(),
});

export const adminPhysicalCardActionSchema = z.object({
	organizationId: z.string().uuid(),
	cardId: z.string().uuid(),
});

export const adminAssignCardSchema = adminPhysicalCardActionSchema.extend({
	vcardId: z.string().uuid(),
});
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `admin-vcard-schemas.ts`

- [ ] **Step 3: Commit**

```bash
git add schemas/admin-vcard-schemas.ts
git commit -m "feat: add Zod schemas for admin vCard and physical card mutations"
```

---

## Task 2: Create admin vCard router with update and delete mutations

**Files:**
- Create: `trpc/routers/admin/admin-vcard-router.ts`
- Modify: `trpc/routers/admin/index.ts`

- [ ] **Step 1: Create the admin vCard router**

Create `trpc/routers/admin/admin-vcard-router.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	adminDeleteVcardSchema,
	adminUpdateVcardSchema,
} from "@/schemas/admin-vcard-schemas";
import { createTRPCRouter, protectedAdminProcedure } from "@/trpc/init";

export const adminVcardRouter = createTRPCRouter({
	update: protectedAdminProcedure
		.input(adminUpdateVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();
			const { organizationId, vcardId, ...data } = input;

			// Verify vcard belongs to this organization
			const { data: vcard, error: findError } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", vcardId)
				.eq("organization_id", organizationId)
				.single();

			if (findError || !vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata in questa organizzazione",
				});
			}

			// If slug is being changed, check uniqueness within org
			if (data.slug) {
				const { data: existing } = await adminClient
					.from("vcard")
					.select("id")
					.eq("organization_id", organizationId)
					.eq("slug", data.slug)
					.neq("id", vcardId)
					.maybeSingle();

				if (existing) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Questo slug e gia in uso in questa organizzazione",
					});
				}
			}

			const { error } = await adminClient
				.from("vcard")
				.update(data)
				.eq("id", vcardId);

			if (error) {
				logger.error({ error }, "Admin: failed to update vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare la vCard",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId, vcardId, action: "update" },
				"Admin updated vcard",
			);

			return { success: true };
		}),

	delete: protectedAdminProcedure
		.input(adminDeleteVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify vcard belongs to this organization
			const { data: vcard, error: findError } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (findError || !vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata in questa organizzazione",
				});
			}

			// Unassign any physical cards linked to this vcard
			await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("vcard_id", input.vcardId);

			const { error } = await adminClient
				.from("vcard")
				.delete()
				.eq("id", input.vcardId);

			if (error) {
				logger.error({ error }, "Admin: failed to delete vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile eliminare la vCard",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					vcardId: input.vcardId,
					action: "delete",
				},
				"Admin deleted vcard",
			);

			return { success: true };
		}),
});
```

- [ ] **Step 2: Register the router in the admin index**

In `trpc/routers/admin/index.ts`, add the import and register the new router:

```typescript
import { createTRPCRouter } from "@/trpc/init";
import { adminOrganizationRouter } from "@/trpc/routers/admin/admin-organization-router";
import { adminPhysicalCardRouter } from "@/trpc/routers/admin/admin-physical-card-router";
import { adminUserRouter } from "@/trpc/routers/admin/admin-user-router";
import { adminVcardRouter } from "@/trpc/routers/admin/admin-vcard-router";

export const adminRouter = createTRPCRouter({
	organization: adminOrganizationRouter,
	physicalCard: adminPhysicalCardRouter,
	user: adminUserRouter,
	vcard: adminVcardRouter,
});
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/admin/admin-vcard-router.ts trpc/routers/admin/index.ts
git commit -m "feat: add admin vCard router with update and delete mutations"
```

---

## Task 3: Add physical card admin mutations (assign, unassign, disable, enable)

**Files:**
- Modify: `trpc/routers/admin/admin-physical-card-router.ts`

- [ ] **Step 1: Add the four new mutations to the existing router**

Add new imports at top of file (line 5, after `createAdminClient` import):

```typescript
import {
	adminAssignCardSchema,
	adminPhysicalCardActionSchema,
	generatePhysicalCardsBatchSchema,
	listOrgPhysicalCardsAdminSchema,
	listOrgVcardsAdminSchema,
	updateOrganizationLimitsSchema,
} from "@/schemas/admin-vcard-schemas";
```

Add these four mutations after the `listOrgPhysicalCards` procedure (after line 172, before the closing `});`):

```typescript
	assign: protectedAdminProcedure
		.input(adminAssignCardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org and is free
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status === "assigned") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Card gia assegnata. Scollegala prima di riassegnarla.",
				});
			}
			if (card.status === "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Card disattivata. Riattivala prima di assegnarla.",
				});
			}

			// Verify vcard belongs to org
			const { data: vcard } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!vcard) {
				throw new TRPCError({ code: "NOT_FOUND", message: "vCard non trovata" });
			}

			// Check vcard doesn't already have a card assigned
			const { data: existingCard } = await adminClient
				.from("physical_card")
				.select("id")
				.eq("vcard_id", input.vcardId)
				.eq("status", "assigned")
				.maybeSingle();

			if (existingCard) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa vCard ha gia una card fisica assegnata.",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: input.vcardId, status: "assigned" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to assign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile assegnare la card",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId: input.organizationId, cardId: input.cardId, vcardId: input.vcardId, action: "assign" },
				"Admin assigned physical card",
			);

			return { success: true };
		}),

	unassign: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status !== "assigned") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa card non e assegnata",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to unassign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile scollegare la card",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId: input.organizationId, cardId: input.cardId, action: "unassign" },
				"Admin unassigned physical card",
			);

			return { success: true };
		}),

	disable: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status === "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa card e gia disattivata",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "disabled" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to disable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile disattivare la card",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId: input.organizationId, cardId: input.cardId, action: "disable" },
				"Admin disabled physical card",
			);

			return { success: true };
		}),

	enable: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status !== "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Solo le card disattivate possono essere riattivate",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ status: "free" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to enable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile riattivare la card",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId: input.organizationId, cardId: input.cardId, action: "enable" },
				"Admin enabled physical card",
			);

			return { success: true };
		}),
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add trpc/routers/admin/admin-physical-card-router.ts
git commit -m "feat: add admin physical card assign/unassign/disable/enable mutations"
```

---

## Task 4: Create admin edit vCard modal

**Files:**
- Create: `components/admin/organizations/admin-edit-vcard-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/admin/organizations/admin-edit-vcard-modal.tsx`:

```typescript
"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { adminUpdateVcardSchema } from "@/schemas/admin-vcard-schemas";
import { trpc } from "@/trpc/client";

export type AdminEditVcardModalProps = NiceModalHocProps & {
	organizationId: string;
	vcard: {
		id: string;
		first_name: string;
		last_name: string;
		slug: string;
		email: string | null;
		phone: string | null;
		job_title: string | null;
		status: string;
	};
};

export const AdminEditVcardModal =
	NiceModal.create<AdminEditVcardModalProps>(({ organizationId, vcard }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const mutation = trpc.admin.vcard.update.useMutation({
			onSuccess: () => {
				toast.success("vCard aggiornata");
				utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

		const form = useZodForm({
			schema: adminUpdateVcardSchema.omit({
				organizationId: true,
				vcardId: true,
			}),
			defaultValues: {
				first_name: vcard.first_name,
				last_name: vcard.last_name,
				slug: vcard.slug,
				email: vcard.email ?? "",
				phone: vcard.phone ?? "",
				job_title: vcard.job_title ?? "",
				status: vcard.status as "active" | "suspended" | "archived",
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			mutation.mutate({
				organizationId,
				vcardId: vcard.id,
				...data,
			});
		});

		return (
			<Sheet
				onOpenChange={modal.handleOpenChange}
				open={modal.visible}
			>
				<SheetContent onAnimationEndCapture={modal.handleAnimationEndCapture}>
					<SheetHeader>
						<SheetTitle>Modifica vCard</SheetTitle>
						<SheetDescription>
							Modifica i dati della vCard di {vcard.first_name} {vcard.last_name}
						</SheetDescription>
					</SheetHeader>
					<Form {...form}>
						<form className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
							<FormField
								control={form.control}
								name="first_name"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Nome</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="last_name"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Cognome</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input {...field} type="email" value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Telefono</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="job_title"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Ruolo</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Slug</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Stato</FormLabel>
											<Select
												defaultValue={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="active">Attiva</SelectItem>
													<SelectItem value="suspended">Sospesa</SelectItem>
													<SelectItem value="archived">Archiviata</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<SheetFooter>
								<Button
									onClick={modal.handleClose}
									type="button"
									variant="outline"
								>
									Annulla
								</Button>
								<Button loading={mutation.isPending} type="submit">
									Salva
								</Button>
							</SheetFooter>
						</form>
					</Form>
				</SheetContent>
			</Sheet>
		);
	});
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/admin-edit-vcard-modal.tsx
git commit -m "feat: add admin edit vCard modal component"
```

---

## Task 5: Create admin assign card modal

**Files:**
- Create: `components/admin/organizations/admin-assign-card-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/admin/organizations/admin-assign-card-modal.tsx`:

```typescript
"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { trpc } from "@/trpc/client";

export type AdminAssignCardModalProps = NiceModalHocProps & {
	organizationId: string;
	cardId: string;
	cardCode: string;
};

export const AdminAssignCardModal =
	NiceModal.create<AdminAssignCardModalProps>(
		({ organizationId, cardId, cardCode }) => {
			const modal = useEnhancedModal();
			const utils = trpc.useUtils();
			const [open, setOpen] = React.useState(false);
			const [selectedVcardId, setSelectedVcardId] = React.useState<string | null>(null);
			const [search, setSearch] = React.useState("");

			const { data: vcardsData } = trpc.admin.physicalCard.listOrgVcards.useQuery({
				organizationId,
				limit: 100,
				offset: 0,
				query: search || undefined,
			});

			// Filter out vcards that already have a physical card assigned
			// We need to check the physical_card list for assigned cards
			const { data: assignedCards } = trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
				organizationId,
				limit: 1000,
				offset: 0,
			});

			const assignedVcardIds = new Set(
				assignedCards?.data
					?.filter((c) => c.status === "assigned" && c.vcard)
					.map((c) => c.vcard!.id) ?? [],
			);

			const availableVcards = vcardsData?.data?.filter(
				(v) => v.status === "active" && !assignedVcardIds.has(v.id),
			) ?? [];

			const selectedVcard = availableVcards.find((v) => v.id === selectedVcardId);

			const mutation = trpc.admin.physicalCard.assign.useMutation({
				onSuccess: () => {
					toast.success("Card assegnata");
					utils.admin.physicalCard.listOrgPhysicalCards.invalidate({ organizationId });
					modal.handleClose();
				},
				onError: (error) => {
					toast.error(error.message);
				},
			});

			const handleAssign = () => {
				if (!selectedVcardId) return;
				mutation.mutate({ organizationId, cardId, vcardId: selectedVcardId });
			};

			return (
				<Sheet onOpenChange={modal.handleOpenChange} open={modal.visible}>
					<SheetContent onAnimationEndCapture={modal.handleAnimationEndCapture}>
						<SheetHeader>
							<SheetTitle>Assegna card fisica</SheetTitle>
							<SheetDescription>
								Assegna la card <strong>{cardCode}</strong> a una vCard
							</SheetDescription>
						</SheetHeader>
						<div className="px-4">
							<Popover open={open} onOpenChange={setOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className="w-full justify-start"
									>
										{selectedVcard
											? `${selectedVcard.first_name} ${selectedVcard.last_name}`
											: "Seleziona una vCard..."}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-full p-0" align="start">
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Cerca per nome..."
											value={search}
											onValueChange={setSearch}
										/>
										<CommandList>
											<CommandEmpty>Nessuna vCard disponibile</CommandEmpty>
											{availableVcards.map((v) => (
												<CommandItem
													key={v.id}
													value={v.id}
													onSelect={() => {
														setSelectedVcardId(v.id);
														setOpen(false);
													}}
												>
													{v.first_name} {v.last_name}
													{v.email && (
														<span className="ml-2 text-muted-foreground text-xs">
															{v.email}
														</span>
													)}
												</CommandItem>
											))}
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
						<SheetFooter>
							<Button
								onClick={modal.handleClose}
								type="button"
								variant="outline"
							>
								Annulla
							</Button>
							<Button
								disabled={!selectedVcardId}
								loading={mutation.isPending}
								onClick={handleAssign}
							>
								Assegna
							</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			);
		},
	);
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/admin-assign-card-modal.tsx
git commit -m "feat: add admin assign card modal with vCard search"
```

---

## Task 6: Add action icons to admin vCard tab

**Files:**
- Modify: `components/admin/organizations/org-vcards-tab.tsx`

- [ ] **Step 1: Add action icons to the vCard table**

Replace the entire content of `components/admin/organizations/org-vcards-tab.tsx`:

```typescript
"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ArchiveIcon,
	PauseCircleIcon,
	PencilIcon,
	PlayCircleIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { AdminEditVcardModal } from "@/components/admin/organizations/admin-edit-vcard-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VcardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

interface OrgVcardsTabProps {
	organizationId: string;
}

interface AdminVcard {
	id: string;
	first_name: string;
	last_name: string;
	slug: string;
	email: string | null;
	phone: string | null;
	job_title: string | null;
	status: string;
	created_at: string;
}

export function OrgVcardsTab({
	organizationId,
}: OrgVcardsTabProps): React.JSX.Element {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const utils = trpc.useUtils();

	const { data, isLoading } = trpc.admin.physicalCard.listOrgVcards.useQuery({
		organizationId,
		limit: pageSize,
		offset: pageIndex * pageSize,
		query: searchQuery || undefined,
	});

	const updateMutation = trpc.admin.vcard.update.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
		},
	});

	const deleteMutation = trpc.admin.vcard.delete.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
		},
	});

	const handleStatusChange = (vcardId: string, newStatus: "active" | "suspended" | "archived") => {
		updateMutation.mutate({ organizationId, vcardId, status: newStatus });
	};

	const columns: ColumnDef<AdminVcard>[] = [
		{
			accessorKey: "first_name",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Nome" />
			),
			cell: ({ row }) =>
				`${row.original.first_name} ${row.original.last_name}`,
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => row.original.email ?? "—",
		},
		{
			accessorKey: "job_title",
			header: "Ruolo",
			cell: ({ row }) => row.original.job_title ?? "—",
		},
		{
			accessorKey: "status",
			header: "Stato",
			cell: ({ row }) => (
				<VcardStatusBadge status={row.original.status as VcardStatus} />
			),
		},
		{
			accessorKey: "slug",
			header: "Slug",
			cell: ({ row }) => (
				<span className="font-mono text-muted-foreground text-xs">
					{row.original.slug}
				</span>
			),
		},
		{
			accessorKey: "created_at",
			header: "Creata",
			cell: ({ row }) => format(new Date(row.original.created_at), "dd MMM, yyyy"),
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			cell: ({ row }) => {
				const vcard = row.original;
				return (
					<div className="flex items-center justify-end gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="size-8 text-muted-foreground"
									onClick={() => {
										NiceModal.show(AdminEditVcardModal, {
											organizationId,
											vcard,
										});
									}}
								>
									<PencilIcon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Modifica</TooltipContent>
						</Tooltip>

						{vcard.status === "active" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Sospendere la vCard?",
												message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra sospesa e non sara piu visibile pubblicamente.`,
												confirmLabel: "Sospendi",
												onConfirm: () => handleStatusChange(vcard.id, "suspended"),
											});
										}}
									>
										<PauseCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Sospendi</TooltipContent>
							</Tooltip>
						)}

						{vcard.status === "suspended" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => handleStatusChange(vcard.id, "active")}
									>
										<PlayCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Riattiva</TooltipContent>
							</Tooltip>
						)}

						{vcard.status !== "archived" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Archiviare la vCard?",
												message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra archiviata.`,
												confirmLabel: "Archivia",
												onConfirm: () => handleStatusChange(vcard.id, "archived"),
											});
										}}
									>
										<ArchiveIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Archivia</TooltipContent>
							</Tooltip>
						)}

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="size-8 text-destructive"
									onClick={() => {
										NiceModal.show(ConfirmationModal, {
											title: "Eliminare la vCard?",
											message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra eliminata permanentemente. Le card fisiche collegate verranno scollegate.`,
											confirmLabel: "Elimina",
											destructive: true,
											onConfirm: () =>
												deleteMutation.mutateAsync({
													organizationId,
													vcardId: vcard.id,
												}),
										});
									}}
								>
									<Trash2Icon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Elimina</TooltipContent>
						</Tooltip>
					</div>
				);
			},
		},
	];

	return (
		<DataTable
			columns={columns}
			data={data?.data ?? []}
			emptyMessage="Nessuna vCard trovata"
			loading={isLoading}
			manualPagination
			onPageChange={setPageIndex}
			onSearch={setSearchQuery}
			pageCount={Math.ceil((data?.total ?? 0) / pageSize)}
			pageIndex={pageIndex}
			pageSize={pageSize}
			searchPlaceholder="Cerca per nome o email..."
			totalCount={data?.total ?? 0}
		/>
	);
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/org-vcards-tab.tsx
git commit -m "feat: add inline action icons to admin vCard table"
```

---

## Task 7: Add action icons to admin physical cards tab

**Files:**
- Modify: `components/admin/organizations/org-physical-cards-tab.tsx`

- [ ] **Step 1: Add action icons to the physical cards table**

Replace the entire content of `components/admin/organizations/org-physical-cards-tab.tsx`:

```typescript
"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	BanIcon,
	CheckCircleIcon,
	LinkIcon,
	PlusIcon,
	UnlinkIcon,
} from "lucide-react";
import * as React from "react";
import { AdminAssignCardModal } from "@/components/admin/organizations/admin-assign-card-modal";
import { GenerateCardsModal } from "@/components/admin/organizations/generate-cards-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { PhysicalCardStatusBadge } from "@/components/organization/physical-card-status-badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PhysicalCardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

interface OrgPhysicalCardsTabProps {
	organizationId: string;
	maxPhysicalCards: number;
}

interface AdminPhysicalCard {
	id: string;
	code: string;
	status: string;
	created_at: string;
	vcard: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
}

export function OrgPhysicalCardsTab({
	organizationId,
	maxPhysicalCards,
}: OrgPhysicalCardsTabProps): React.JSX.Element {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const utils = trpc.useUtils();

	const { data, isLoading } =
		trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
			organizationId,
			limit: pageSize,
			offset: pageIndex * pageSize,
			query: searchQuery || undefined,
		});

	const remaining = maxPhysicalCards - (data?.total ?? 0);

	const assignMutation = trpc.admin.physicalCard.assign.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({ organizationId });
		},
	});

	const unassignMutation = trpc.admin.physicalCard.unassign.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({ organizationId });
		},
	});

	const disableMutation = trpc.admin.physicalCard.disable.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({ organizationId });
		},
	});

	const enableMutation = trpc.admin.physicalCard.enable.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({ organizationId });
		},
	});

	const columns: ColumnDef<AdminPhysicalCard>[] = [
		{
			accessorKey: "code",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Codice" />
			),
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.original.code}</span>
			),
		},
		{
			accessorKey: "status",
			header: "Stato",
			cell: ({ row }) => (
				<PhysicalCardStatusBadge
					status={row.original.status as PhysicalCardStatus}
				/>
			),
		},
		{
			accessorKey: "vcard",
			header: "vCard collegata",
			cell: ({ row }) =>
				row.original.vcard
					? `${row.original.vcard.first_name} ${row.original.vcard.last_name}`
					: "—",
		},
		{
			accessorKey: "created_at",
			header: "Creata",
			cell: ({ row }) =>
				format(new Date(row.original.created_at), "dd MMM, yyyy"),
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			cell: ({ row }) => {
				const card = row.original;
				return (
					<div className="flex items-center justify-end gap-1">
						{card.status === "free" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(AdminAssignCardModal, {
												organizationId,
												cardId: card.id,
												cardCode: card.code,
											});
										}}
									>
										<LinkIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Assegna a vCard</TooltipContent>
							</Tooltip>
						)}

						{card.status === "assigned" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Scollegare la card?",
												message: `La card ${card.code} verra scollegata dalla vCard di ${card.vcard?.first_name} ${card.vcard?.last_name}.`,
												confirmLabel: "Scollega",
												onConfirm: () =>
													unassignMutation.mutateAsync({
														organizationId,
														cardId: card.id,
													}),
											});
										}}
									>
										<UnlinkIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Scollega</TooltipContent>
							</Tooltip>
						)}

						{card.status !== "disabled" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-destructive"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Disattivare la card?",
												message: `La card ${card.code} verra disattivata${card.vcard ? ` e scollegata dalla vCard di ${card.vcard.first_name} ${card.vcard.last_name}` : ""}.`,
												confirmLabel: "Disattiva",
												destructive: true,
												onConfirm: () =>
													disableMutation.mutateAsync({
														organizationId,
														cardId: card.id,
													}),
											});
										}}
									>
										<BanIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Disattiva</TooltipContent>
							</Tooltip>
						)}

						{card.status === "disabled" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() =>
											enableMutation.mutate({
												organizationId,
												cardId: card.id,
											})
										}
									>
										<CheckCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Riattiva</TooltipContent>
							</Tooltip>
						)}
					</div>
				);
			},
		},
	];

	return (
		<DataTable
			columns={columns}
			data={data?.data ?? []}
			emptyMessage="Nessuna card fisica trovata"
			loading={isLoading}
			manualPagination
			onPageChange={setPageIndex}
			onSearch={setSearchQuery}
			pageCount={Math.ceil((data?.total ?? 0) / pageSize)}
			pageIndex={pageIndex}
			pageSize={pageSize}
			searchPlaceholder="Cerca per codice..."
			toolbarActions={
				<Button
					onClick={() =>
						NiceModal.show(GenerateCardsModal, {
							organizationId,
							remaining,
						})
					}
					size="sm"
				>
					<PlusIcon className="mr-2 size-4" />
					Genera card fisiche
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/org-physical-cards-tab.tsx
git commit -m "feat: add inline action icons to admin physical cards table"
```

---

## Task 8: Add 2FA enforcement to `protectedAdminProcedure` (tRPC level)

**Files:**
- Modify: `trpc/init.ts`

- [ ] **Step 1: Add 2FA check to protectedAdminProcedure**

Replace the `protectedAdminProcedure` definition (lines 202-210 in `trpc/init.ts`):

Old code:
```typescript
export const protectedAdminProcedure = protectedProcedure.use(
	({ ctx, next }) => {
		if (ctx.profile?.role !== "admin") {
			throw new TRPCError({ code: "FORBIDDEN", message: "Accesso negato" });
		}

		return next({ ctx });
	},
);
```

New code:
```typescript
export const protectedAdminProcedure = protectedProcedure.use(
	async ({ ctx, next }) => {
		if (ctx.profile?.role !== "admin") {
			throw new TRPCError({ code: "FORBIDDEN", message: "Accesso negato" });
		}

		// Enforce 2FA for admin procedures
		const { data: factors } = await ctx.supabase.auth.mfa.listFactors();
		const hasVerifiedFactor = factors?.totp?.some(
			(f) => f.status === "verified",
		);

		if (!hasVerifiedFactor) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message:
					"Configura l'autenticazione a due fattori per accedere alle funzionalita admin",
			});
		}

		const aal = ctx.claims?.aal ?? "aal1";
		if (aal !== "aal2") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Autenticazione a due fattori richiesta",
			});
		}

		return next({ ctx });
	},
);
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add trpc/init.ts
git commit -m "feat: enforce 2FA on all admin tRPC procedures"
```

---

## Task 9: Add 2FA enforcement to middleware (`proxy.ts`)

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Add 2FA check for admin routes in proxy.ts**

Add the admin 2FA check after the onboarding check (after line 218, before `return response;` on line 220). The new code goes between the onboarding redirect block and the `return response;`:

```typescript
		// Enforce 2FA for platform admins accessing admin routes
		if (pathname.startsWith("/dashboard/admin")) {
			// Check if user is a platform admin
			if (profile?.role === "admin") {
				const { data: factors } =
					await supabase.auth.mfa.listFactors();
				const hasVerifiedFactor = factors?.totp?.some(
					(f: { status: string }) => f.status === "verified",
				);

				if (!hasVerifiedFactor) {
					return NextResponse.redirect(
						new URL("/dashboard/account/setup-2fa", origin),
					);
				}

				// Check AAL level from JWT claims
				const aal = user.aal ?? "aal1";
				if (aal !== "aal2") {
					return NextResponse.redirect(
						new URL(
							withQuery("/auth/verify", {
								redirectTo: pathname,
							}),
							origin,
						),
					);
				}
			}
		}
```

Also add `role` to the profile select query. Change line 186 from:

```typescript
		const { data: profile } = await supabase
			.from("user_profile")
			.select("banned, ban_expires, onboarding_complete")
			.eq("id", user.sub)
			.single();
```

To:

```typescript
		const { data: profile } = await supabase
			.from("user_profile")
			.select("banned, ban_expires, onboarding_complete, role")
			.eq("id", user.sub)
			.single();
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: enforce 2FA redirect for admin routes in middleware"
```

---

## Task 10: Create the mandatory 2FA setup page

**Files:**
- Create: `app/(saas)/dashboard/(sidebar)/account/setup-2fa/page.tsx`

- [ ] **Step 1: Create the setup 2FA page**

Create `app/(saas)/dashboard/(sidebar)/account/setup-2fa/page.tsx`:

```typescript
import type { Metadata } from "next";
import type * as React from "react";
import { Setup2faCard } from "@/components/admin/setup-2fa-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Configura autenticazione a due fattori",
};

export default function Setup2faPage(): React.JSX.Element {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Setup2faCard />
		</div>
	);
}
```

- [ ] **Step 2: Create the Setup2faCard component**

Create `components/admin/setup-2fa-card.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";

type View = "password" | "totp-setup" | "verify";

export function Setup2faCard(): React.JSX.Element {
	const router = useRouter();
	const { user } = useSession();
	const [view, setView] = React.useState<View>("password");
	const [password, setPassword] = React.useState("");
	const [totpURI, setTotpURI] = React.useState("");
	const [totpCode, setTotpCode] = React.useState("");
	const [error, setError] = React.useState("");
	const [loading, setLoading] = React.useState(false);

	const totpSecret = React.useMemo(() => {
		if (!totpURI) return "";
		try {
			return new URL(totpURI).searchParams.get("secret") ?? "";
		} catch {
			return "";
		}
	}, [totpURI]);

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const supabase = createClient();

			// Verify password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user?.email ?? "",
				password,
			});

			if (signInError) {
				setError("Password non corretta");
				return;
			}

			// Enroll TOTP
			const { data, error: enrollError } = await supabase.auth.mfa.enroll({
				factorType: "totp",
			});

			if (enrollError || !data) {
				setError("Impossibile configurare il 2FA. Riprova.");
				return;
			}

			setTotpURI(data.totp.uri);
			setView("totp-setup");
		} finally {
			setLoading(false);
		}
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const supabase = createClient();

			const { data: factors } = await supabase.auth.mfa.listFactors();
			const totpFactor = factors?.totp?.find(
				(f) => f.status === "unverified",
			);

			if (!totpFactor) {
				setError("Fattore TOTP non trovato. Riprova.");
				return;
			}

			const { data: challenge, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

			if (challengeError || !challenge) {
				setError("Errore nella verifica. Riprova.");
				return;
			}

			const { error: verifyError } = await supabase.auth.mfa.verify({
				factorId: totpFactor.id,
				challengeId: challenge.id,
				code: totpCode,
			});

			if (verifyError) {
				setError("Codice non valido. Riprova.");
				return;
			}

			// Refresh session to get AAL2
			await supabase.auth.refreshSession();
			toast.success("Autenticazione a due fattori configurata");
			router.push("/dashboard/admin");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Configura autenticazione a due fattori</CardTitle>
				<CardDescription>
					Per accedere al pannello di amministrazione, e necessario
					configurare l'autenticazione a due fattori.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{view === "password" && (
					<form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
						<Field>
							<Label>Conferma la tua password</Label>
							<InputPassword
								onChange={(e) => setPassword(e.target.value)}
								value={password}
							/>
						</Field>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<Button loading={loading} type="submit">
							Continua
						</Button>
					</form>
				)}

				{view === "totp-setup" && (
					<form className="flex flex-col gap-4" onSubmit={handleVerify}>
						<div className="flex justify-center rounded-lg bg-white p-4">
							<QRCode size={200} value={totpURI} />
						</div>
						<p className="text-center text-muted-foreground text-xs">
							Scansiona il QR code con la tua app di autenticazione (Google
							Authenticator, Authy, ecc.)
						</p>
						{totpSecret && (
							<p className="text-center font-mono text-muted-foreground text-xs">
								Chiave manuale: {totpSecret}
							</p>
						)}
						<Field>
							<Label>Codice di verifica</Label>
							<Input
								autoComplete="one-time-code"
								maxLength={6}
								onChange={(e) => setTotpCode(e.target.value)}
								placeholder="000000"
								value={totpCode}
							/>
						</Field>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<Button loading={loading} type="submit">
							Verifica e attiva
						</Button>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/(saas)/dashboard/(sidebar)/account/setup-2fa/page.tsx components/admin/setup-2fa-card.tsx
git commit -m "feat: add mandatory 2FA setup page for platform admins"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run type check**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type errors from admin actions and 2FA implementation"
```
