# Pattern UI

Pattern riutilizzabili del kit. Per ogni nuovo modulo, scegliere il pattern piu adatto e seguire la struttura dei file di reference.

---

## Pattern A: Tabella CRUD con Sheet laterale

### Quando usarlo

Gestione entita con lista, filtri, ordinamento, azioni bulk e form in sheet laterale. Ideale per risorse che richiedono ricerca, paginazione server-side, selezione multipla e operazioni di massa (es. lead, contatti, ticket, prodotti).

### Struttura

```
Server Page (page.tsx)
  └─ Page / PageHeader / PageBreadcrumb / PageBody / PageContent
       └─ Client Table Component ("use client")
            ├─ Filtri URL con nuqs useQueryState
            ├─ Query tRPC con paginazione server-side
            ├─ DataTable (colonne, ordinamento, selezione righe)
            ├─ Toolbar con bottone "Aggiungi" → NiceModal.show(SheetModal)
            ├─ Bulk actions bar (DataTableBulkActions)
            └─ Sheet laterale (NiceModal) con form useZodForm
```

### Componenti utilizzati

| Import | Package / Path |
|--------|---------------|
| `Page, PageHeader, PagePrimaryBar, PageBreadcrumb, PageBody, PageContent` | `@/components/ui/custom/page` |
| `DataTable, FilterConfig, SortableColumnHeader, createSelectionColumn, DataTableBulkActions` | `@/components/ui/custom/data-table` |
| `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter` | `@/components/ui/sheet` |
| `Form, FormControl, FormField, FormItem, FormLabel, FormMessage` | `@/components/ui/form` |
| `Field` | `@/components/ui/field` |
| `Button` | `@/components/ui/button` |
| `Badge` | `@/components/ui/badge` |
| `Input, Select, Textarea, ScrollArea` | `@/components/ui/*` |
| `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger` | `@/components/ui/dropdown-menu` |
| `ConfirmationModal` | `@/components/confirmation-modal` |
| `NiceModal` | `@ebay/nice-modal-react` |
| `useEnhancedModal` | `@/hooks/use-enhanced-modal` |
| `useZodForm` | `@/hooks/use-zod-form` |
| `useQueryState, parseAsString, parseAsInteger, parseAsArrayOf, parseAsJson` | `nuqs` |
| `ColumnDef, ColumnFiltersState, SortingState` | `@tanstack/react-table` |
| `trpc` | `@/trpc/client` |
| `toast` | `sonner` |
| `format` | `date-fns` |

### Snippet struttura pagina (server component)

```tsx
// app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx
import { redirect } from "next/navigation";
import { LeadsTable } from "@/components/organization/leads-table";
import {
  Page, PageBody, PageBreadcrumb, PageContent, PageHeader, PagePrimaryBar,
} from "@/components/ui/custom/page";
import { getOrganizationById, getSession } from "@/lib/auth/server";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session?.session.activeOrganizationId) {
    redirect("/dashboard");
  }
  const organization = await getOrganizationById(
    session.session.activeOrganizationId,
  );
  if (!organization) {
    redirect("/dashboard");
  }

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageBreadcrumb
            segments={[
              { label: "Home", href: "/dashboard" },
              { label: organization.name, href: "/dashboard/organization" },
              { label: "Lead" },
            ]}
          />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody>
        <PageContent title="Lead">
          <LeadsTable />
        </PageContent>
      </PageBody>
    </Page>
  );
}
```

### Snippet struttura tabella (client component)

```tsx
"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { parseAsArrayOf, parseAsInteger, parseAsJson, parseAsString, useQueryState } from "nuqs";
import {
  createSelectionColumn, DataTable, type FilterConfig, SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import { trpc } from "@/trpc/client";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: false }];

export function LeadsTable() {
  const [rowSelection, setRowSelection] = React.useState({});

  // Ogni filtro e nella URL via nuqs
  const [searchQuery, setSearchQuery] = useQueryState(
    "query", parseAsString.withDefault("").withOptions({ shallow: true }),
  );
  const [pageIndex, setPageIndex] = useQueryState(
    "pageIndex", parseAsInteger.withDefault(0).withOptions({ shallow: true }),
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize", parseAsInteger.withDefault(DEFAULT_PAGE_SIZE).withOptions({ shallow: true }),
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status", parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: true }),
  );
  const [sorting, setSorting] = useQueryState<SortingState>(
    "sort", parseAsJson<SortingState>((value) => { /* validation */ })
      .withDefault(DEFAULT_SORTING).withOptions({ shallow: true }),
  );

  // Query tRPC server-side con paginazione
  const { data, isPending } = trpc.organization.lead.list.useQuery({
    limit: pageSize || DEFAULT_PAGE_SIZE,
    offset: (pageIndex || 0) * (pageSize || DEFAULT_PAGE_SIZE),
    query: searchQuery || "",
    sortBy: sortParams.sortBy,
    sortOrder: sortParams.sortOrder,
    filters: { status: statusFilter, source: sourceFilter, createdAt: createdAtFilter },
  }, { placeholderData: (prev) => prev });

  // Colonne con SortableColumnHeader, Badge per enum, DropdownMenu per azioni riga
  const columns: ColumnDef<Lead>[] = [
    createSelectionColumn<Lead>(),
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nome" />,
      cell: ({ row }) => { /* ... */ },
    },
    // ... altre colonne ...
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuItem onClick={() => NiceModal.show(LeadsModal, { lead: { /* mapped data */ } })}>
            Modifica
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => NiceModal.show(ConfirmationModal, { /* ... */ })} variant="destructive">
            Elimina
          </DropdownMenuItem>
        </DropdownMenu>
      ),
    },
  ];

  // Configurazione filtri
  const leadFilters: FilterConfig[] = [
    { key: "status", title: "Stato", options: [ /* ... */ ] },
    { key: "source", title: "Fonte", options: [ /* ... */ ] },
    { key: "createdAt", title: "Creato", options: [ /* ... */ ] },
  ];

  return (
    <DataTable
      columns={columns}
      data={(data?.leads as Lead[]) || []}
      emptyMessage="Nessun lead trovato."
      enableFilters enablePagination enableRowSelection enableSearch
      filters={leadFilters}
      loading={isPending}
      onFiltersChange={handleFiltersChange}
      onPageIndexChange={setPageIndex}
      onPageSizeChange={setPageSize}
      onRowSelectionChange={setRowSelection}
      onSearchQueryChange={handleSearchQueryChange}
      onSortingChange={handleSortingChange}
      pageIndex={pageIndex || 0}
      pageSize={pageSize || DEFAULT_PAGE_SIZE}
      renderBulkActions={(table) => <LeadsBulkActions table={table} />}
      rowSelection={rowSelection}
      searchPlaceholder="Cerca lead..."
      searchQuery={searchQuery || ""}
      defaultSorting={DEFAULT_SORTING}
      sorting={sorting}
      toolbarActions={
        <Button onClick={() => NiceModal.show(LeadsModal)} size="sm">
          <PlusIcon className="size-4 shrink-0" />
          Aggiungi Lead
        </Button>
      }
      totalCount={data?.total ?? 0}
    />
  );
}
```

### Snippet struttura sheet form (NiceModal)

```tsx
"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { createLeadSchema, updateLeadSchema } from "@/schemas/organization-lead-schemas";
import { trpc } from "@/trpc/client";

export type LeadsModalProps = NiceModalHocProps & {
  lead?: { id: string; firstName: string; /* ... */ };
};

export const LeadsModal = NiceModal.create<LeadsModalProps>(({ lead }) => {
  const modal = useEnhancedModal();
  const utils = trpc.useUtils();
  const isEditing = !!lead;

  const createMutation = trpc.organization.lead.create.useMutation({
    onSuccess: () => {
      toast.success("Lead creato con successo");
      utils.organization.lead.list.invalidate();
      modal.handleClose();
    },
    onError: (error) => toast.error(error.message || "Impossibile creare il lead"),
  });

  const updateMutation = trpc.organization.lead.update.useMutation({
    onSuccess: () => {
      toast.success("Lead aggiornato con successo");
      utils.organization.lead.list.invalidate();
      modal.handleClose();
    },
    onError: (error) => toast.error(error.message || "Impossibile aggiornare il lead"),
  });

  const form = useZodForm({
    schema: isEditing ? updateLeadSchema : createLeadSchema,
    defaultValues: isEditing
      ? { id: lead.id, firstName: lead.firstName, /* ... */ }
      : { firstName: "", lastName: "", /* ... */ },
  });

  const onSubmit = form.handleSubmit((data) => {
    isEditing ? updateMutation.mutate(data) : createMutation.mutate(data);
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={modal.visible} onOpenChange={(open) => !open && modal.handleClose()}>
      <SheetContent className="sm:max-w-lg" onAnimationEndCapture={modal.handleAnimationEndCapture}>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica Lead" : "Crea Lead"}</SheetTitle>
          <SheetDescription className="sr-only">...</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-4 px-6 py-4">
                {/* FormField per ogni campo */}
              </div>
            </ScrollArea>
            <SheetFooter>
              <Button type="submit" loading={isPending}>
                {isEditing ? "Salva" : "Crea"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
});
```

### Snippet azioni bulk

```tsx
"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { Table } from "@tanstack/react-table";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { type BulkActionItem, DataTableBulkActions } from "@/components/ui/custom/data-table";
import { trpc } from "@/trpc/client";

export function LeadsBulkActions<T extends { id: string }>({ table }: { table: Table<T> }) {
  const utils = trpc.useUtils();
  const bulkDelete = trpc.organization.lead.bulkDelete.useMutation();

  const handleBulkDelete = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    NiceModal.show(ConfirmationModal, {
      title: "Eliminare i lead?",
      message: `Sei sicuro di voler eliminare ${selectedRows.length} lead?`,
      confirmLabel: "Elimina",
      destructive: true,
      onConfirm: async () => {
        const ids = selectedRows.map((row) => row.original.id);
        await bulkDelete.mutateAsync({ ids });
        table.resetRowSelection();
        utils.organization.lead.list.invalidate();
      },
    });
  };

  const actions: BulkActionItem[] = [
    { label: "Cambia stato", actions: [ /* sub-actions per stato */ ] },
    { label: "Esporta in CSV", separator: true, onClick: () => { /* ... */ } },
    { label: "Esporta in Excel", onClick: () => { /* ... */ } },
    { label: "Elimina", onClick: handleBulkDelete, variant: "destructive", separator: true },
  ];

  return <DataTableBulkActions table={table} actions={actions} />;
}
```

### File di reference

| File | Scopo |
|------|-------|
| `app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx` | Server page con layout |
| `components/organization/leads-table.tsx` | Tabella client con filtri, paginazione, colonne |
| `components/organization/leads-modal.tsx` | Sheet form create/edit con NiceModal |
| `components/organization/leads-bulk-actions.tsx` | Azioni bulk (delete, export, change status) |
| `schemas/organization-lead-schemas.ts` | Zod schemas (create, update, list, sort) |
| `trpc/routers/organization/organization-lead-router.ts` | Router tRPC (list, create, update, delete, bulk) |

---

## Pattern B: Settings a Tab

### Quando usarlo

Pagine impostazioni con sezioni raggruppate in tab. Ogni tab contiene una o piu card con form o azioni. Tab condizionali in base al ruolo utente e ai feature flag.

### Struttura

```
Server Page
  └─ Page / PageHeader / PageBody / PageContent
       └─ SettingsTabs ("use client")
            └─ UnderlinedTabs (tab attivo in URL via nuqs)
                 ├─ Tab "general" (solo admin)
                 │    ├─ LogoCard
                 │    ├─ ChangeNameCard (form)
                 │    └─ DeleteCard (danger, con ConfirmationModal)
                 ├─ Tab "members"
                 │    ├─ InviteMemberCard (solo admin)
                 │    └─ MembersCard
                 ├─ Tab "subscription" (se billing abilitato)
                 └─ Tab "credits" (se billing abilitato)
```

### Componenti utilizzati

| Import | Package / Path |
|--------|---------------|
| `UnderlinedTabs, UnderlinedTabsList, UnderlinedTabsTrigger, UnderlinedTabsContent` | `@/components/ui/custom/underlined-tabs` |
| `Card, CardContent, CardDescription, CardHeader, CardTitle` | `@/components/ui/card` |
| `Form, FormControl, FormField, FormItem, FormLabel, FormMessage` | `@/components/ui/form` |
| `Field` | `@/components/ui/field` |
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `ConfirmationModal` | `@/components/confirmation-modal` |
| `NiceModal` | `@ebay/nice-modal-react` |
| `useZodForm` | `@/hooks/use-zod-form` |
| `useActiveOrganization` | `@/hooks/use-active-organization` |
| `useProgressRouter` | `@/hooks/use-progress-router` |
| `parseAsStringLiteral, useQueryState` | `nuqs` |
| `trpc` | `@/trpc/client` |
| `toast` | `sonner` |

### Snippet struttura tabs

```tsx
"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  UnderlinedTabs, UnderlinedTabsContent, UnderlinedTabsList, UnderlinedTabsTrigger,
} from "@/components/ui/custom/underlined-tabs";
import { billingConfig } from "@/config/billing.config";

const tabValues = ["general", "members", "subscription", "credits"] as const;
type TabValue = (typeof tabValues)[number];

type OrganizationSettingsTabsProps = {
  isAdmin: boolean;
};

export function OrganizationSettingsTabs({ isAdmin }: OrganizationSettingsTabsProps) {
  const defaultTab = isAdmin ? "general" : "members";
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabValues).withDefault(defaultTab),
  );

  return (
    <UnderlinedTabs
      className="w-full"
      value={tab}
      onValueChange={(value) => setTab(value as TabValue)}
    >
      <UnderlinedTabsList className="mb-6 sm:-ml-4">
        {isAdmin && (
          <UnderlinedTabsTrigger value="general">Generale</UnderlinedTabsTrigger>
        )}
        <UnderlinedTabsTrigger value="members">Membri</UnderlinedTabsTrigger>
        {billingConfig.enabled && (
          <UnderlinedTabsTrigger value="subscription">Abbonamento</UnderlinedTabsTrigger>
        )}
        {billingConfig.enabled && (
          <UnderlinedTabsTrigger value="credits">Crediti</UnderlinedTabsTrigger>
        )}
      </UnderlinedTabsList>

      {isAdmin && (
        <UnderlinedTabsContent value="general">
          <div className="space-y-4">
            <OrganizationLogoCard />
            <OrganizationChangeNameCard />
            <DeleteOrganizationCard />
          </div>
        </UnderlinedTabsContent>
      )}
      <UnderlinedTabsContent value="members">
        <div className="space-y-4">
          {isAdmin && <OrganizationInviteMemberCard />}
          <OrganizationMembersCard />
        </div>
      </UnderlinedTabsContent>
      {/* ... tab condizionali per billing */}
    </UnderlinedTabs>
  );
}
```

### Pattern card impostazioni

**Card standard** (form con salvataggio):

```tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useZodForm } from "@/hooks/use-zod-form";
import { changeOrganizationNameSchema } from "@/schemas/organization-schemas";
import { trpc } from "@/trpc/client";

export function OrganizationChangeNameCard() {
  const router = useProgressRouter();
  const utils = trpc.useUtils();
  const { data: organization } = useActiveOrganization();

  const methods = useZodForm({
    schema: changeOrganizationNameSchema,
    values: { name: organization?.name ?? "" },
  });

  const updateMutation = trpc.organization.management.update.useMutation({
    onSuccess: () => {
      toast.success("Il nome dell'organizzazione e stato aggiornato.");
      utils.organization.list.invalidate();
      router.refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nome organizzazione</CardTitle>
        <CardDescription>Descrizione...</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit((data) => updateMutation.mutate(data))}>
            {/* FormField + Button Salva */}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

**Card danger** (azione distruttiva con conferma):

```tsx
"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { trpc } from "@/trpc/client";

export function DeleteOrganizationCard() {
  const { data: organization } = useActiveOrganization();
  const deleteMutation = trpc.organization.management.delete.useMutation({ /* ... */ });

  const handleDelete = () => {
    NiceModal.show(ConfirmationModal, {
      title: "Elimina organizzazione",
      message: `Sei sicuro di voler eliminare "${organization.name}"?`,
      destructive: true,
      requiredText: organization.name, // L'utente deve digitare il nome per confermare
      onConfirm: () => deleteMutation.mutate(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elimina organizzazione</CardTitle>
        <CardDescription>Questa azione e irreversibile.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={handleDelete}>Elimina</Button>
      </CardContent>
    </Card>
  );
}
```

### File di reference

| File | Scopo |
|------|-------|
| `components/organization/organization-settings-tabs.tsx` | Container tabs con logica condizionale |
| `components/organization/organization-change-name-card.tsx` | Card form standard |
| `components/organization/organization-logo-card.tsx` | Card upload immagine |
| `components/organization/delete-organization-card.tsx` | Card danger con conferma |
| `components/organization/organization-members-card.tsx` | Card lista membri |
| `components/organization/organization-invite-member-card.tsx` | Card invito membro |

---

## Pattern C: Griglia Card

### Quando usarlo

Lista di entita visualizzate come card in griglia responsive. Ideale per selezione (es. organizzazioni, progetti), non per dati tabulari complessi. Include skeleton loading, stato vuoto con CTA e navigazione al click.

### Struttura

```
Client Component ("use client")
  ├─ isPending → Skeleton grid
  ├─ data.length === 0 → Empty state con CTA
  └─ data → @container responsive grid
       ├─ Card per ogni entita (click → azione)
       └─ Card "+" per creare (opzionale, condizionale)
```

### Componenti utilizzati

| Import | Package / Path |
|--------|---------------|
| `Card, CardContent, CardFooter` | `@/components/ui/card` |
| `Empty, EmptyHeader, EmptyTitle, EmptyDescription` | `@/components/ui/empty` |
| `Skeleton` | `@/components/ui/skeleton` |
| `Button, buttonVariants` | `@/components/ui/button` |
| `NiceModal` | `@ebay/nice-modal-react` |
| `useProgressRouter` | `@/hooks/use-progress-router` |
| `trpc` | `@/trpc/client` |
| `cn` | `@/lib/utils` |
| `clearOrganizationScopedQueries` | `@/trpc/query-client` |
| `appConfig` | `@/config/app.config` |
| `featuresConfig` | `@/config/features.config` |

### Snippet struttura griglia

```tsx
"use client";

import NiceModal from "@ebay/nice-modal-react";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export function OrganizationsGrid() {
  const router = useProgressRouter();
  const { data: allOrganizations, isPending } = trpc.organization.list.useQuery();
  const [selectingOrgId, setSelectingOrgId] = React.useState<string | null>(null);

  // --- Skeleton loading ---
  if (isPending) {
    return (
      <div className="@container">
        <div className="grid @8xl:grid-cols-5 @7xl:grid-cols-4 @3xl:grid-cols-3 @xl:grid-cols-2 grid-cols-1 gap-4">
          {[...new Array(3)].map((_, i) => (
            <div className="relative flex h-36 flex-col justify-between pt-4 pb-0 rounded-lg border" key={i}>
              <div className="flex flex-row items-center justify-between px-4">
                <Skeleton className="size-6 rounded-md" />
                <Skeleton className="h-6 w-24 rounded" />
              </div>
              <div className="mt-auto flex items-center justify-between border-t px-4 py-2">
                <Skeleton className="size-3 rounded-full" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (allOrganizations?.length === 0) {
    return (
      <Empty className="h-60 border">
        <EmptyHeader>
          <EmptyTitle>Nessuna organizzazione</EmptyTitle>
          <EmptyDescription>Crea un'organizzazione per iniziare.</EmptyDescription>
        </EmptyHeader>
        <Button onClick={() => NiceModal.show(CreateOrganizationModal)} variant="default">
          Crea un'organizzazione
        </Button>
      </Empty>
    );
  }

  // --- Grid con @container queries ---
  return (
    <div className="@container">
      <div className="grid @8xl:grid-cols-5 @7xl:grid-cols-4 @3xl:grid-cols-3 @xl:grid-cols-2 grid-cols-1 gap-4 animate-in fade-in duration-300">
        {allOrganizations?.map((org) => (
          <button
            className="group block h-full cursor-pointer text-left"
            onClick={() => handleSelectOrganization(org.id)}
            key={org.id}
            type="button"
          >
            <Card className={cn(
              "relative flex h-36 flex-col justify-between rounded-lg pt-4 pb-0",
              "transition-all hover:bg-secondary/20 hover:shadow-xs",
            )}>
              <CardContent className="flex flex-row items-center justify-between px-4">
                {/* Logo + Nome */}
              </CardContent>
              <CardFooter className="mt-auto flex items-center justify-between border-t px-4 py-2!">
                {/* Info + azione */}
              </CardFooter>
            </Card>
          </button>
        ))}
        {/* Card "+" per creare nuova entita (condizionale) */}
        {appConfig.organizations.allowUserCreation && featuresConfig.multiOrg && (
          <button
            className={cn(buttonVariants({ variant: "outline" }), "h-36 rounded-lg")}
            onClick={() => NiceModal.show(CreateOrganizationModal)}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Crea un'organizzazione</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

**Pattern chiave:**
- `@container` + classi `@Nxl:grid-cols-N` per responsive senza media query globali
- Skeleton che replica esattamente la struttura della card
- Empty state con `Empty/EmptyHeader/EmptyTitle/EmptyDescription` + CTA
- `animate-in fade-in duration-300` per transizione al caricamento
- Card "+" opzionale per creazione rapida, controllata da config/feature flags

### File di reference

| File | Scopo |
|------|-------|
| `components/organization/organizations-grid.tsx` | Griglia completa con skeleton, empty, card |
| `components/organization/create-organization-modal.tsx` | Modal creazione (aperta dalla grid) |

---

## Pattern E: Wizard Multi-step

### Quando usarlo

Flussi guidati con step sequenziali (onboarding, setup iniziale, wizard di configurazione). La server page valida la sessione e redirige se il flusso e gia completato. Il client component gestisce lo step corrente e la progressione.

### Struttura

```
Server Page (page.tsx)
  ├─ getSession() → redirect se non autenticato
  ├─ Controllo completamento → redirect se gia fatto
  └─ <WizardCard /> (client component)

Client WizardCard ("use client")
  ├─ Step corrente da URL (searchParams) o useState
  ├─ Progress bar (se totalSteps > 1)
  ├─ Step component attivo
  └─ onCompleted → aggiorna metadata + redirect

Step Component ("use client")
  ├─ useZodForm con schema dello step
  ├─ Form con campi specifici
  └─ onSubmit → salva + chiama onCompleted
```

### Componenti utilizzati

| Import | Package / Path |
|--------|---------------|
| `Card, CardContent, CardDescription, CardHeader, CardTitle` | `@/components/ui/card` |
| `Progress` | `@/components/ui/progress` |
| `Form, FormControl, FormField, FormItem, FormLabel` | `@/components/ui/form` |
| `Input` | `@/components/ui/input` |
| `Button` | `@/components/ui/button` |
| `useZodForm` | `@/hooks/use-zod-form` |
| `useSession` | `@/hooks/use-session` |
| `useProgressRouter` | `@/hooks/use-progress-router` |
| `getSession` | `@/lib/auth/server` |
| `createClient` | `@/lib/supabase/client` |
| `trpc` | `@/trpc/client` |

### Snippet struttura page (server component)

```tsx
// app/(saas)/dashboard/onboarding/page.tsx
import { redirect } from "next/navigation";
import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Configura il tuo account" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    return redirect("/auth/sign-in");
  }
  if (session.user.onboardingComplete) {
    return redirect("/dashboard");
  }
  return <OnboardingCard />;
}
```

### Snippet struttura wizard (client component)

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { OnboardingProfileStep } from "@/components/onboarding/onboarding-profile-step";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

export function OnboardingCard() {
  const router = useProgressRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();

  const stepSearchParam = searchParams.get("step");
  const redirectTo = searchParams.get("redirectTo");
  const onboardingStep = stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1;

  const onCompleted = async () => {
    const supabase = createClient();
    // Aggiorna metadata utente
    await supabase.auth.updateUser({ data: { onboardingComplete: true } });
    // Aggiorna profilo DB (controllato dal middleware proxy)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_profile").update({ onboarding_complete: true }).eq("id", user.id);
    }
    await utils.user.getSession.invalidate();
    router.replace(redirectTo ?? "/dashboard");
  };

  // Array di step — aggiungere qui nuovi step
  const steps = [
    { component: <OnboardingProfileStep onCompleted={() => onCompleted()} /> },
    // { component: <SecondStep onCompleted={() => goToNextStep()} /> },
  ];

  const totalSteps = steps.length;
  const progress = (onboardingStep / totalSteps) * 100;

  return (
    <Card className="w-full border-transparent px-4 py-8 dark:border-border">
      <CardHeader>
        <CardTitle className="text-base lg:text-lg">Configura il tuo account</CardTitle>
        <CardDescription>Solo pochi passaggi per iniziare.</CardDescription>
      </CardHeader>
      <CardContent>
        {totalSteps > 1 && (
          <div className="mb-6 flex items-center gap-3">
            <Progress className="h-2" value={progress} />
            <span className="shrink-0 text-foreground/60 text-xs">
              {`Passaggio ${onboardingStep} / ${totalSteps}`}
            </span>
          </div>
        )}
        {steps[onboardingStep - 1]!.component}
      </CardContent>
    </Card>
  );
}
```

### Snippet struttura step

```tsx
"use client";

import { ArrowRightIcon } from "lucide-react";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { useZodForm } from "@/hooks/use-zod-form";

const formSchema = z.object({
  name: z.string(),
});

type OnboardingProfileStepProps = {
  onCompleted: () => void;
};

export function OnboardingProfileStep({ onCompleted }: OnboardingProfileStepProps) {
  const { user } = useSession();
  const methods = useZodForm({
    schema: formSchema,
    defaultValues: { name: user?.name ?? "" },
  });

  const onSubmit = methods.handleSubmit(async ({ name }) => {
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { name } });
    onCompleted();
  });

  return (
    <Form {...methods}>
      <form className="flex flex-col items-stretch gap-8" onSubmit={onSubmit}>
        <FormField
          control={methods.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl><Input {...field} /></FormControl>
            </FormItem>
          )}
        />
        {/* Altri campi (es. avatar upload) */}
        <Button loading={methods.formState.isSubmitting} type="submit">
          Continua
          <ArrowRightIcon className="ml-2 size-4 shrink-0" />
        </Button>
      </form>
    </Form>
  );
}
```

**Pattern chiave:**
- Step corrente da `searchParams.get("step")` (URL-driven) oppure `useState`
- Progress bar visibile solo se `totalSteps > 1`
- Ogni step riceve `onCompleted` come prop callback
- Il wizard gestisce aggiornamento metadata + invalidazione sessione + redirect
- `force-dynamic` + `revalidate = 0` sulla server page per evitare caching

### File di reference

| File | Scopo |
|------|-------|
| `app/(saas)/dashboard/onboarding/page.tsx` | Server page con validazione sessione e redirect |
| `components/onboarding/onboarding-card.tsx` | Wizard container con step management e progress |
| `components/onboarding/onboarding-profile-step.tsx` | Step profilo con form e avatar upload |

---

## Come scegliere il pattern

| Scenario | Pattern | Motivo |
|----------|---------|--------|
| CRUD con filtri, paginazione, export | **A - Tabella CRUD** | Dati tabulari, ricerca server-side, azioni bulk |
| Impostazioni con sezioni | **B - Settings a Tab** | Tab condizionali, card form, azioni danger |
| Lista selezionabile con card | **C - Griglia Card** | Visualizzazione compatta, selezione rapida |
| Onboarding o setup guidato | **E - Wizard Multi-step** | Flusso sequenziale, validazione per step |
| Dettaglio singola entita | **B - Settings a Tab** | Riutilizzare il layout a card con tab per sezioni |
| Dashboard con metriche | **C - Griglia Card** | Card per KPI, adattabile a stat cards |

## Documenti correlati

- [MODULES.md](./MODULES.md) - Architettura moduli
- [ADDING-ENTITY.md](./ADDING-ENTITY.md) - Guida aggiunta entita end-to-end
- [FEATURE-FLAGS.md](./FEATURE-FLAGS.md) - Feature flags
