"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { Table } from "@tanstack/react-table";
import type * as React from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/confirmation-modal";
import {
	CsvDelimiterModal,
	type DelimiterType,
} from "@/components/csv-delimiter-modal";
import {
	type BulkActionItem,
	DataTableBulkActions,
} from "@/components/ui/custom/data-table";
import { downloadCsv, downloadExcel } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export type OrganizationBulkActionsProps<T> = {
	table: Table<T>;
};

export function OrganizationBulkActions<T extends { id: string }>({
	table,
}: OrganizationBulkActionsProps<T>): React.JSX.Element {
	const exportCsv = trpc.admin.organization.exportSelectedToCsv.useMutation();
	const exportExcel =
		trpc.admin.organization.exportSelectedToExcel.useMutation();
	const syncFromStripe = trpc.admin.organization.syncFromStripe.useMutation();
	const utils = trpc.useUtils();

	const getDelimiterChar = (delimiterType: DelimiterType): string => {
		switch (delimiterType) {
			case "comma":
				return ",";
			case "semicolon":
				return ";";
			case "tab":
				return "\t";
			default:
				return ",";
		}
	};

	const handleExportSelectedToCsv = async (delimiter: DelimiterType) => {
		const selectedRows = table.getSelectedRowModel().rows;
		if (selectedRows.length === 0) {
			toast.error("Nessuna organizzazione selezionata.");
			return;
		}
		const organizationIds = selectedRows.map((row) => row.original.id);
		try {
			const csv = await exportCsv.mutateAsync({ organizationIds });
			const delimiterChar = getDelimiterChar(delimiter);
			const csvData =
				delimiter === "comma" ? csv : csv.replace(/,/g, delimiterChar);
			downloadCsv(csvData, "organizations.csv");
			toast.success("CSV esportato.");
		} catch (_err) {
			toast.error("Esportazione CSV fallita.");
		}
	};

	const handleExportSelectedToExcel = async () => {
		const selectedRows = table.getSelectedRowModel().rows;
		if (selectedRows.length === 0) {
			toast.error("Nessuna organizzazione selezionata.");
			return;
		}
		const organizationIds = selectedRows.map((row) => row.original.id);
		try {
			const base64 = await exportExcel.mutateAsync({ organizationIds });
			downloadExcel(base64, "organizations.xlsx");
			toast.success("Excel esportato.");
		} catch (_err) {
			toast.error("Esportazione Excel fallita.");
		}
	};

	const actions: BulkActionItem[] = [
		{
			label: "Esporta in CSV",
			onClick: () => {
				NiceModal.show(CsvDelimiterModal, {
					onConfirm: handleExportSelectedToCsv,
				});
			},
		},
		{
			label: "Esporta in Excel",
			onClick: handleExportSelectedToExcel,
		},
		{
			label: "Sincronizza da Stripe",
			variant: "default",
			onClick: () => {
				const selectedRows = table.getSelectedRowModel().rows;
				if (selectedRows.length === 0) {
					toast.error("Nessuna organizzazione selezionata.");
					return;
				}
				const organizationIds = selectedRows.map((row) => row.original.id);
				NiceModal.show(ConfirmationModal, {
					title: "Sincronizza da Stripe",
					message: `Sincronizzare abbonamenti e acquisti di crediti per ${organizationIds.length} organizzazion${organizationIds.length !== 1 ? "i" : "e"} da Stripe?`,
					confirmLabel: "Sincronizza",
					onConfirm: async () => {
						await syncFromStripe.mutateAsync(
							{ organizationIds },
							{
								onSuccess: (result) => {
									const subResult = result.subscriptions;
									const orderResult = result.orders;

									if (
										subResult.failed === 0 &&
										subResult.skipped === 0 &&
										orderResult.failed === 0
									) {
										toast.success(
											"Dati di fatturazione e crediti sincronizzati da Stripe.",
										);
									} else {
										toast.warning(
											"Sincronizzazione completata con alcuni problemi. Controlla i log per i dettagli.",
										);
									}
									utils.admin.organization.list.invalidate();
									table.resetRowSelection();
								},
								onError: (error) => {
									toast.error(`Sincronizzazione fallita: ${error.message}`);
								},
							},
						);
					},
				});
			},
		},
	];

	return <DataTableBulkActions actions={actions} table={table} />;
}
