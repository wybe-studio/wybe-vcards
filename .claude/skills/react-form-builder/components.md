# Form Components Reference

## Import Pattern

```typescript
import { useZodForm } from "@/hooks/use-zod-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
```

## Text Input Field

```tsx
<FormField
  name="firstName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Nome</FormLabel>
      <FormControl>
        <Input
          data-test="first-name-input"
          placeholder="Inserisci il nome"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Select Field

```tsx
<FormField
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Stato</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger data-test="status-select">
            <SelectValue placeholder="Seleziona stato" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="active">Attivo</SelectItem>
          <SelectItem value="draft">Bozza</SelectItem>
          <SelectItem value="archived">Archiviato</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Checkbox Field

```tsx
<FormField
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex items-center space-x-2">
      <FormControl>
        <Checkbox
          data-test="accept-terms-checkbox"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <FormLabel className="mt-0!">Accetto i termini</FormLabel>
    </FormItem>
  )}
/>
```

## Switch Field

```tsx
<FormField
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div>
        <FormLabel>Notifiche</FormLabel>
        <FormDescription>Ricevi notifiche via email</FormDescription>
      </div>
      <FormControl>
        <Switch
          data-test="notifications-switch"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

## Textarea Field

```tsx
<FormField
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Note</FormLabel>
      <FormControl>
        <Textarea
          data-test="notes-textarea"
          placeholder="Inserisci le note..."
          rows={4}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Submit Button

```tsx
<Button
  type="submit"
  disabled={mutation.isPending}
  data-test="submit-button"
>
  {mutation.isPending ? "Salvataggio..." : "Salva"}
</Button>
```

## Complete Form Template (Create)

```tsx
"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { trpc } from "@/lib/trpc/client";
import { createFeatureSchema } from "@/schemas/feature-schemas";

interface FeatureFormProps {
  organizationId: string;
  onSuccess?: () => void;
}

export function FeatureForm({ organizationId, onSuccess }: FeatureFormProps) {
  const utils = trpc.useUtils();

  const mutation = trpc.organization.feature.create.useMutation({
    onSuccess: () => {
      toast.success("Elemento creato con successo");
      utils.organization.feature.list.invalidate();
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useZodForm({
    schema: createFeatureSchema,
    defaultValues: {
      name: "",
      email: "",
    },
  });

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) => {
          mutation.mutate({ ...data, organizationId });
        })}
      >
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input data-test="name-input" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  data-test="email-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={mutation.isPending}
          data-test="submit-button"
        >
          {mutation.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Form>
  );
}
```

## Complete Form Template (Edit)

```tsx
"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { trpc } from "@/lib/trpc/client";
import { updateFeatureSchema } from "@/schemas/feature-schemas";

interface EditFeatureFormProps {
  feature: { id: string; name: string; email: string };
  onSuccess?: () => void;
}

export function EditFeatureForm({ feature, onSuccess }: EditFeatureFormProps) {
  const utils = trpc.useUtils();

  const mutation = trpc.organization.feature.update.useMutation({
    onSuccess: () => {
      toast.success("Modifiche salvate");
      utils.organization.feature.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useZodForm({
    schema: updateFeatureSchema,
    defaultValues: {
      name: feature.name,
      email: feature.email,
    },
  });

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) => {
          mutation.mutate({ id: feature.id, ...data });
        })}
      >
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input data-test="name-input" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  data-test="email-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={mutation.isPending}
          data-test="submit-button"
        >
          {mutation.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Form>
  );
}
```
