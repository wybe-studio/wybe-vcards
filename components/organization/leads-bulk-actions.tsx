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
import { LeadStatus } from "@/lib/enums";
import { capitalize, downloadCsv, downloadExcel } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export type LeadsBulkActionsProps<T> = {
	table: Table<T>;
};

const statusLabels: Record<string, string> = {
	new: "Nuovo",
	contacted: "Contattato",
	qualified: "Qualificato",
	proposal: "Proposta",
	negotiation: "Negoziazione",
	won: "Vinto",
	lost: "Perso",
};

export function LeadsBulkActions<T extends { id: string }>({
	table,
}: LeadsBulkActionsProps<T>): React.JSX.Element {
	const utils = trpc.useUtils();

	const exportCsv = trpc.organization.lead.exportSelectedToCsv.useMutation();
	const exportExcel =
		trpc.organization.lead.exportSelectedToExcel.useMutation();
	const bulkDelete = trpc.organization.lead.bulkDelete.useMutation();
	const bulkUpdateStatus =
		trpc.organization.lead.bulkUpdateStatus.useMutation();

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
			toast.error("Nessun lead selezionato.");
			return;
		}
		const leadIds = selectedRows.map((row) => row.original.id);
		try {
			const csv = await exportCsv.mutateAsync({ leadIds });
			const delimiterChar = getDelimiterChar(delimiter);
			const csvData =
				delimiter === "comma" ? csv : csv.replace(/,/g, delimiterChar);
			downloadCsv(csvData, "leads.csv");
			toast.success("CSV esportato.");
		} catch (_err) {
			toast.error("Errore durante l'esportazione CSV.");
		}
	};

	const handleExportSelectedToExcel = async () => {
		const selectedRows = table.getSelectedRowModel().rows;
		if (selectedRows.length === 0) {
			toast.error("Nessun lead selezionato.");
			return;
		}
		const leadIds = selectedRows.map((row) => row.original.id);
		try {
			const base64 = await exportExcel.mutateAsync({ leadIds });
			downloadExcel(base64, "leads.xlsx");
			toast.success("Excel esportato.");
		} catch (_err) {
			toast.error("Errore durante l'esportazione Excel.");
		}
	};

	const handleBulkDelete = () => {
		const selectedRows = table.getSelectedRowModel().rows;
		if (selectedRows.length === 0) {
			toast.error("Nessun lead selezionato.");
			return;
		}

		NiceModal.show(ConfirmationModal, {
			title: "Eliminare i lead?",
			message: `Sei sicuro di voler eliminare ${selectedRows.length} lead? Questa azione non può essere annullata.`,
			confirmLabel: "Elimina",
			destructive: true,
			onConfirm: async () => {
				const ids = selectedRows.map((row) => row.original.id);
				try {
					await bulkDelete.mutateAsync({ ids });
					toast.success(`${selectedRows.length} lead eliminati.`);
					table.resetRowSelection();
					utils.organization.lead.list.invalidate();
				} catch (_err) {
					toast.error("Errore durante l'eliminazione dei lead.");
				}
			},
		});
	};

	const handleBulkUpdateStatus = async (status: LeadStatus) => {
		const selectedRows = table.getSelectedRowModel().rows;
		if (selectedRows.length === 0) {
			toast.error("Nessun lead selezionato.");
			return;
		}

		const ids = selectedRows.map((row) => row.original.id);
		try {
			await bulkUpdateStatus.mutateAsync({ ids, status });
			toast.success(
				`${selectedRows.length} lead aggiornati a ${statusLabels[status] || capitalize(status)}.`,
			);
			table.resetRowSelection();
			utils.organization.lead.list.invalidate();
		} catch (_err) {
			toast.error("Errore durante l'aggiornamento dei lead.");
		}
	};

	const statusActions: BulkActionItem[] = Object.values(LeadStatus).map(
		(status) => ({
			label: `Imposta a ${statusLabels[status] || capitalize(status)}`,
			onClick: () => handleBulkUpdateStatus(status),
		}),
	);

	const actions: BulkActionItem[] = [
		{
			label: "Cambia stato",
			actions: statusActions,
		},
		{
			label: "Esporta in CSV",
			separator: true,
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
			label: "Elimina",
			onClick: handleBulkDelete,
			variant: "destructive",
			separator: true,
		},
	];

	return <DataTableBulkActions table={table} actions={actions} />;
}
