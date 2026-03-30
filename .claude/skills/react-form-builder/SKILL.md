---
name: react-form-builder
description: Create or modify client-side forms using react-hook-form, useZodForm hook, @/components/ui/form components, and tRPC mutations. Use when building forms with validation, error handling, loading states, and TypeScript typing. Invoke with /react-form-builder.
---

# React Form Builder

You are an expert at building robust, accessible, and type-safe forms for this project using react-hook-form, Zod validation, and tRPC mutations.

## Core Responsibilities

### 1. Form Structure Requirements

- Use `useZodForm` hook from `@/hooks/use-zod-form` (wraps react-hook-form with zodResolver)
- Zod schemas stored in `schemas/` at project root (e.g., `schemas/lead-schemas.ts`)
- Use `@/components/ui/form` components (Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage)
- Use tRPC mutations via `trpc.router.procedure.useMutation()` for server communication
- Use `isPending` from tRPC mutation for loading states

### 2. tRPC Mutation Integration

- Use `trpc.[router].[procedure].useMutation()` for all mutations
- Handle success/error via `onSuccess` and `onError` callbacks
- Use `isPending` from the mutation for button disabled state
- Invalidate queries after successful mutations with `utils.[router].[procedure].invalidate()`
- NEVER call tRPC procedures directly — always use the React hooks

```typescript
const utils = trpc.useUtils();
const mutation = trpc.organization.lead.create.useMutation({
  onSuccess: () => {
    toast.success("Lead creato con successo");
    utils.organization.lead.list.invalidate();
    onClose?.();
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### 3. Code Organization

```
schemas/
└── feature-schemas.ts       # Zod schemas (shared between client & server)
components/
└── feature/
    └── feature-form.tsx     # Form component
trpc/routers/
└── organization/
    └── feature-router.ts    # tRPC procedures
```

### 4. Import Guidelines

```typescript
// Form hook
import { useZodForm } from "@/hooks/use-zod-form";

// Form components
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";

// UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// Toast notifications
import { toast } from "sonner";

// tRPC
import { trpc } from "@/lib/trpc/client";
```

### 5. Best Practices

- All user-facing strings in **Italian** (hardcoded, no i18n system)
- Add `data-test` attributes for E2E testing on form elements and submit buttons
- No `any` types — use proper TypeScript typing
- Handle both success and error states gracefully
- Disable submit buttons during pending states
- Include FormDescription for user guidance where useful
- Let zodResolver infer types — don't add redundant generics to useForm/useZodForm

### 6. State Management

- Use `isPending` from tRPC mutation for loading states — NOT `useTransition`
- Avoid multiple separate useState calls — prefer single state objects when appropriate
- Never use useEffect unless absolutely necessary and justified

### 7. Validation Patterns

- Create reusable Zod schemas in `schemas/` directory, shared between client and server
- Use `.trim()` on string fields
- Separate schemas for create vs update (update fields are `.optional()`)
- Use `z.nativeEnum()` for enum fields from `lib/enums`
- Error messages in Italian

### 8. Schema Conventions

```typescript
// schemas/feature-schemas.ts
import { z } from "zod";

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(255),
  status: z.nativeEnum(FeatureStatus).default(FeatureStatus.active),
  value: z.number().min(0, "Il valore deve essere positivo").optional(),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;

// Update schema: all fields optional
export const updateFeatureSchema = createFeatureSchema.partial();
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

### 9. Accessibility and UX

- Always include FormLabel for screen readers
- Provide helpful FormDescription text (in Italian)
- Show clear error messages with FormMessage
- Implement loading indicators during form submission
- Use semantic HTML

## Components Reference

See `[Components](components.md)` for form field patterns and complete form template.
