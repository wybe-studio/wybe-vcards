import { z } from "zod";

const hexColor = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Colore hex non valido")
	.optional()
	.nullable();

export const updateOrganizationStyleSchema = z.object({
	auroraColorPrimary: hexColor,
	auroraColorSecondary: hexColor,
	headerBgColor: hexColor,
	headerTextColor: hexColor,
	buttonBgColor: hexColor,
	buttonTextColor: hexColor,
	tabBgColor: hexColor,
	slugFormat: z.enum(["readable", "uuid"]).optional(),
});
