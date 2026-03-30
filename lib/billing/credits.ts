import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoggerFactory } from "@/lib/logger/factory";

const logger = LoggerFactory.getLogger("credits");

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_METADATA_SIZE = 10 * 1024; // 10KB max for metadata JSON

// ============================================================================
// TYPES
// ============================================================================

export type CreditBalanceSelect = Tables<"credit_balance">;
export type CreditTransactionSelect = Tables<"credit_transaction">;
export type CreditTransactionType = Tables<"credit_transaction">["type"];

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error class for credit operations
 */
export class CreditError extends Error {
	public readonly code: string;
	public readonly userMessage: string;

	constructor(code: string, message: string, userMessage: string) {
		super(message);
		this.name = "CreditError";
		this.code = code;
		this.userMessage = userMessage;
	}
}

/**
 * Thrown when user doesn't have enough credits
 */
export class InsufficientCreditsError extends CreditError {
	constructor(
		public available: number,
		public required: number,
	) {
		super(
			"INSUFFICIENT_CREDITS",
			`Insufficient credits: ${available} available, ${required} required`,
			"You don't have enough credits. Please purchase more credits to continue.",
		);
		this.name = "InsufficientCreditsError";
	}
}

/**
 * Thrown when credit amount is invalid
 */
export class InvalidCreditAmountError extends CreditError {
	constructor(message: string) {
		super("INVALID_AMOUNT", message, "Please enter a valid credit amount.");
		this.name = "InvalidCreditAmountError";
	}
}

/**
 * Thrown when metadata is too large
 */
export class MetadataTooLargeError extends CreditError {
	constructor(size: number) {
		super(
			"METADATA_TOO_LARGE",
			`Metadata too large: ${size} bytes (max ${MAX_METADATA_SIZE})`,
			"The provided data is too large.",
		);
		this.name = "MetadataTooLargeError";
	}
}

/**
 * Thrown when credit balance operation fails
 */
export class CreditBalanceError extends CreditError {
	constructor(message: string) {
		super(
			"BALANCE_ERROR",
			message,
			"Unable to process credit operation. Please try again.",
		);
		this.name = "CreditBalanceError";
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Maximum length for description field */
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Sanitize description text to prevent XSS and limit length
 * - Escapes HTML special characters
 * - Trims and limits to MAX_DESCRIPTION_LENGTH
 */
function sanitizeDescription(description: string | undefined): string | null {
	if (!description) return null;

	// Escape HTML special characters to prevent XSS if rendered in UI
	const escaped = description
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");

	// Trim and limit length
	return escaped.trim().slice(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * Validate and serialize metadata
 * Throws MetadataTooLargeError if too large
 */
function validateAndSerializeMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	if (!metadata) return null;
	const json = JSON.stringify(metadata);
	if (json.length > MAX_METADATA_SIZE) {
		throw new MetadataTooLargeError(json.length);
	}
	return json;
}

// ============================================================================
// BALANCE OPERATIONS
// ============================================================================

/**
 * Get credit balance for an organization
 * Creates balance record if it doesn't exist using upsert
 */
export async function getCreditBalance(
	organizationId: string,
): Promise<CreditBalanceSelect> {
	const adminClient = createAdminClient();

	// Try to get existing balance
	const { data, error } = await adminClient
		.from("credit_balance")
		.select("*")
		.eq("organization_id", organizationId)
		.single();

	if (data) return data;

	// If not found, create one
	if (error && error.code === "PGRST116") {
		const { data: created, error: createError } = await adminClient
			.from("credit_balance")
			.upsert({ organization_id: organizationId }, { onConflict: "organization_id" })
			.select("*")
			.single();

		if (createError) {
			throw new CreditBalanceError(`Failed to create credit balance: ${createError.message}`);
		}
		return created!;
	}

	if (error) {
		throw new CreditBalanceError(`Failed to get credit balance: ${error.message}`);
	}

	return data!;
}

/**
 * Check if organization has enough credits
 */
export async function hasEnoughCredits(
	organizationId: string,
	required: number,
): Promise<boolean> {
	const balance = await getCreditBalance(organizationId);
	return balance.balance >= required;
}

// ============================================================================
// CREDIT OPERATIONS
// ============================================================================

/**
 * Add credits to an organization (purchase, grant, bonus, etc.)
 * Uses the add_credits RPC for atomic balance update + ledger entry
 */
export async function addCredits(params: {
	organizationId: string;
	amount: number;
	type: CreditTransactionType;
	description: string;
	referenceType?: string;
	referenceId?: string;
	createdBy?: string;
	metadata?: Record<string, unknown>;
}): Promise<CreditTransactionSelect> {
	const {
		organizationId,
		amount,
		type,
		description,
		referenceType,
		referenceId,
		createdBy,
		metadata,
	} = params;

	if (amount <= 0) {
		throw new InvalidCreditAmountError("Credit amount must be positive");
	}

	// Validate metadata size
	const serializedMetadata = validateAndSerializeMetadata(metadata);
	const sanitizedDescription = sanitizeDescription(description);

	const adminClient = createAdminClient();

	// Use the add_credits RPC for atomic operation
	const { data: rpcResult, error: rpcError } = await adminClient.rpc("add_credits", {
		p_organization_id: organizationId,
		p_amount: amount,
		p_type: type,
		p_description: sanitizedDescription ?? undefined,
	});

	if (rpcError) {
		throw new CreditBalanceError(`Failed to add credits: ${rpcError.message}`);
	}

	const result = rpcResult as unknown as { transaction_id: string; new_balance: number };

	// If we have additional fields (referenceType, referenceId, createdBy, metadata),
	// update the transaction record
	if (referenceType || referenceId || createdBy || serializedMetadata) {
		const updateData: Record<string, unknown> = {};
		if (referenceType) updateData.reference_type = referenceType;
		if (referenceId) updateData.reference_id = referenceId;
		if (createdBy) updateData.created_by = createdBy;
		if (serializedMetadata) updateData.metadata = serializedMetadata;

		await adminClient
			.from("credit_transaction")
			.update(updateData)
			.eq("id", result.transaction_id);
	}

	// Fetch the full transaction record
	const { data: transaction, error: txError } = await adminClient
		.from("credit_transaction")
		.select("*")
		.eq("id", result.transaction_id)
		.single();

	if (txError || !transaction) {
		throw new CreditBalanceError("Failed to retrieve created transaction");
	}

	logger.info(
		{ organizationId, type, amount, newBalance: result.new_balance },
		"Credits added",
	);
	return transaction;
}

/**
 * Consume credits for AI operations
 * Atomic deduction with insufficient balance check via deduct_credits RPC
 */
export async function consumeCredits(params: {
	organizationId: string;
	amount: number;
	description: string;
	model?: string;
	inputTokens?: number;
	outputTokens?: number;
	referenceType?: string;
	referenceId?: string;
	createdBy?: string;
	metadata?: Record<string, unknown>;
}): Promise<{
	transaction: CreditTransactionSelect;
	remainingBalance: number;
}> {
	const {
		organizationId,
		amount,
		description,
		model,
		inputTokens,
		outputTokens,
		referenceType,
		referenceId,
		createdBy,
		metadata,
	} = params;

	if (amount <= 0) {
		throw new InvalidCreditAmountError("Usage amount must be positive");
	}

	// Validate metadata size
	const serializedMetadata = validateAndSerializeMetadata(metadata);
	const sanitizedDescription = sanitizeDescription(description);

	const adminClient = createAdminClient();

	// Use the deduct_credits RPC for atomic operation
	const { data: rpcResult, error: rpcError } = await adminClient.rpc("deduct_credits", {
		p_organization_id: organizationId,
		p_amount: amount,
		p_description: sanitizedDescription ?? "",
		p_model: model,
	});

	if (rpcError) {
		// Check if it's an insufficient credits error
		if (rpcError.message?.includes("Insufficient")) {
			// Get current balance for the error
			const balance = await getCreditBalance(organizationId);
			throw new InsufficientCreditsError(balance.balance, amount);
		}
		throw new CreditBalanceError(`Failed to deduct credits: ${rpcError.message}`);
	}

	const result = rpcResult as unknown as { transaction_id: string; new_balance: number };

	// Update transaction with additional fields
	const updateData: Record<string, unknown> = {};
	if (inputTokens !== undefined) updateData.input_tokens = inputTokens;
	if (outputTokens !== undefined) updateData.output_tokens = outputTokens;
	if (referenceType) updateData.reference_type = referenceType;
	if (referenceId) updateData.reference_id = referenceId;
	if (createdBy) updateData.created_by = createdBy;
	if (serializedMetadata) updateData.metadata = serializedMetadata;

	if (Object.keys(updateData).length > 0) {
		await adminClient
			.from("credit_transaction")
			.update(updateData)
			.eq("id", result.transaction_id);
	}

	// Fetch the full transaction record
	const { data: transaction, error: txError } = await adminClient
		.from("credit_transaction")
		.select("*")
		.eq("id", result.transaction_id)
		.single();

	if (txError || !transaction) {
		throw new CreditBalanceError("Failed to retrieve deduction transaction");
	}

	logger.info(
		{ organizationId, amount, model, newBalance: result.new_balance },
		"Credits used",
	);
	return { transaction, remainingBalance: result.new_balance };
}

/**
 * Reverse credits due to refund
 * Creates a negative transaction with proper 'refund' type for audit trail
 * Does NOT throw on insufficient balance - logs warning and proceeds
 */
export async function reverseCredits(params: {
	organizationId: string;
	amount: number;
	description: string;
	referenceType: string;
	referenceId: string;
	metadata?: Record<string, unknown>;
}): Promise<CreditTransactionSelect> {
	const {
		organizationId,
		amount,
		description,
		referenceType,
		referenceId,
		metadata,
	} = params;

	if (amount <= 0) {
		throw new InvalidCreditAmountError("Reversal amount must be positive");
	}

	// Validate metadata size
	const serializedMetadata = validateAndSerializeMetadata(metadata);
	const sanitizedDescription = sanitizeDescription(description);

	const adminClient = createAdminClient();

	// Get current balance
	const { data: balanceRow, error: balError } = await adminClient
		.from("credit_balance")
		.select("balance, lifetime_purchased")
		.eq("organization_id", organizationId)
		.single();

	if (balError || !balanceRow) {
		throw new CreditBalanceError("Credit balance not found for organization");
	}

	const actualReversal = Math.min(amount, balanceRow.balance);
	const newBalance = balanceRow.balance - actualReversal;

	if (actualReversal < amount) {
		logger.warn(
			{
				organizationId,
				requestedReversal: amount,
				actualReversal,
				currentBalance: balanceRow.balance,
			},
			"Partial credit reversal - user spent some credits",
		);
	}

	// Update balance
	const { error: updateError } = await adminClient
		.from("credit_balance")
		.update({
			balance: newBalance,
			lifetime_purchased: Math.max(
				0,
				balanceRow.lifetime_purchased - actualReversal,
			),
		})
		.eq("organization_id", organizationId);

	if (updateError) {
		throw new CreditBalanceError(`Failed to update balance: ${updateError.message}`);
	}

	// Create refund transaction
	const { data: transaction, error: txError } = await adminClient
		.from("credit_transaction")
		.insert({
			organization_id: organizationId,
			type: "refund",
			amount: -actualReversal,
			balance_after: newBalance,
			description: sanitizedDescription,
			reference_type: referenceType,
			reference_id: referenceId,
			metadata: serializedMetadata,
		})
		.select("*")
		.single();

	if (txError || !transaction) {
		throw new CreditBalanceError(`Failed to create refund transaction: ${txError?.message}`);
	}

	logger.info(
		{
			organizationId,
			requestedAmount: amount,
			actualReversed: actualReversal,
			newBalance,
			referenceId,
		},
		"Credits reversed due to refund",
	);

	return transaction;
}

/**
 * Admin adjustment (can add or remove credits)
 */
export async function adjustCredits(params: {
	organizationId: string;
	amount: number; // Positive to add, negative to remove
	description: string;
	createdBy: string;
	metadata?: Record<string, unknown>;
}): Promise<CreditTransactionSelect> {
	const { organizationId, amount, description, createdBy, metadata } = params;

	if (amount === 0) {
		throw new InvalidCreditAmountError("Adjustment amount cannot be zero");
	}

	// Validate metadata size
	const serializedMetadata = validateAndSerializeMetadata(metadata);
	const sanitizedDescription = sanitizeDescription(description);

	const adminClient = createAdminClient();

	// Get current balance
	const { data: balanceRow, error: balError } = await adminClient
		.from("credit_balance")
		.select("balance")
		.eq("organization_id", organizationId)
		.single();

	if (balError || !balanceRow) {
		throw new CreditBalanceError("Credit balance not found for organization");
	}

	const newBalance = balanceRow.balance + amount;
	if (newBalance < 0) {
		throw new InvalidCreditAmountError(
			"Adjustment would result in negative balance",
		);
	}

	// Update balance
	const { error: updateError } = await adminClient
		.from("credit_balance")
		.update({ balance: newBalance })
		.eq("organization_id", organizationId);

	if (updateError) {
		throw new CreditBalanceError(`Failed to update balance: ${updateError.message}`);
	}

	// Create adjustment transaction
	const { data: transaction, error: txError } = await adminClient
		.from("credit_transaction")
		.insert({
			organization_id: organizationId,
			type: "adjustment",
			amount,
			balance_after: newBalance,
			description: sanitizedDescription,
			reference_type: "admin",
			created_by: createdBy,
			metadata: serializedMetadata,
		})
		.select("*")
		.single();

	if (txError || !transaction) {
		throw new CreditBalanceError(`Failed to create adjustment transaction: ${txError?.message}`);
	}

	logger.info(
		{ organizationId, amount, newBalance, createdBy },
		"Credits adjusted",
	);

	return transaction;
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * List credit transactions for an organization
 */
export async function listCreditTransactions(
	organizationId: string,
	options?: { limit?: number; offset?: number; type?: CreditTransactionType },
): Promise<CreditTransactionSelect[]> {
	const adminClient = createAdminClient();

	let query = adminClient
		.from("credit_transaction")
		.select("*")
		.eq("organization_id", organizationId)
		.order("created_at", { ascending: false });

	if (options?.type) {
		query = query.eq("type", options.type);
	}

	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;
	query = query.range(offset, offset + limit - 1);

	const { data, error } = await query;

	if (error) {
		throw new CreditBalanceError(`Failed to list transactions: ${error.message}`);
	}

	return data ?? [];
}

// ============================================================================
// CREDIT COST CALCULATION
// ============================================================================

import { type CreditModel, creditCosts } from "@/config/billing.config";

export type { CreditModel };

/**
 * Calculate credit cost for AI usage
 */
export function calculateCreditCost(
	model: string,
	inputTokens: number,
	outputTokens: number,
): number {
	const costs = creditCosts[model as CreditModel];
	if (!costs) {
		// Default to gpt-4o-mini pricing for unknown models
		logger.warn({ model }, "Unknown model, using default pricing");
		const defaultCosts = creditCosts["gpt-4o-mini"];
		const inputCost = Math.ceil((inputTokens / 1000) * defaultCosts.input);
		const outputCost = Math.ceil((outputTokens / 1000) * defaultCosts.output);
		return Math.max(1, inputCost + outputCost); // Minimum 1 credit
	}

	const inputCost = Math.ceil((inputTokens / 1000) * costs.input);
	const outputCost = Math.ceil((outputTokens / 1000) * costs.output);

	return Math.max(1, inputCost + outputCost); // Minimum 1 credit
}

// ============================================================================
// TOKEN ESTIMATION CONSTANTS
// ============================================================================

/** Average characters per token for English text (GPT-style tokenization) */
const CHARS_PER_TOKEN = 4;

/** Minimum expected output tokens for any chat response */
const MIN_OUTPUT_TOKENS = 500;

/** Typical output/input ratio for conversational chat */
const OUTPUT_TO_INPUT_RATIO = 0.7;

/** Safety buffer multiplier to avoid insufficient credits mid-stream (20%) */
const ESTIMATION_BUFFER = 1.2;

/**
 * Estimate credit cost for a message (before sending)
 * Uses a smarter estimation based on input size with safety buffer
 */
export function estimateCreditCost(
	model: string,
	messages: Array<{ content: string }>,
): number {
	const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
	const estimatedInputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);

	// Estimate output based on input (typically 0.5-1.5x input for chat)
	const estimatedOutputTokens = Math.max(
		MIN_OUTPUT_TOKENS,
		Math.ceil(estimatedInputTokens * OUTPUT_TO_INPUT_RATIO),
	);

	// Add buffer for safety to avoid insufficient credits mid-stream
	const bufferedInput = Math.ceil(estimatedInputTokens * ESTIMATION_BUFFER);
	const bufferedOutput = Math.ceil(estimatedOutputTokens * ESTIMATION_BUFFER);

	return calculateCreditCost(model, bufferedInput, bufferedOutput);
}

// ============================================================================
// FAILED DEDUCTION TRACKING
// ============================================================================

/**
 * Log a failed credit deduction for later reconciliation
 * Called when credit deduction fails after AI response is already sent
 */
export async function logFailedDeduction(params: {
	organizationId: string;
	amount: number;
	errorCode: string;
	errorMessage?: string;
	model?: string;
	inputTokens?: number;
	outputTokens?: number;
	referenceType?: string;
	referenceId?: string;
	userId?: string;
}): Promise<void> {
	const {
		organizationId,
		amount,
		errorCode,
		errorMessage,
		model,
		inputTokens,
		outputTokens,
		referenceType,
		referenceId,
		userId,
	} = params;

	try {
		const adminClient = createAdminClient();

		const { error } = await adminClient
			.from("credit_deduction_failure")
			.insert({
				organization_id: organizationId,
				amount,
				error_code: errorCode,
				error_message: errorMessage,
				model,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				reference_type: referenceType,
				reference_id: referenceId,
				user_id: userId,
			});

		if (error) {
			logger.error(
				{ error: error.message, organizationId, amount },
				"Failed to insert credit deduction failure record",
			);
			return;
		}

		logger.warn(
			{
				organizationId,
				amount,
				errorCode,
				model,
				referenceType,
				referenceId,
			},
			"Credit deduction failure logged for reconciliation",
		);
	} catch (error) {
		// Log but don't throw - this is best-effort tracking
		logger.error(
			{ error, organizationId, amount },
			"Failed to log credit deduction failure",
		);
	}
}

/**
 * Get unresolved deduction failures for an organization (admin use)
 */
export async function getUnresolvedDeductionFailures(
	organizationId?: string,
	options?: { limit?: number },
): Promise<Tables<"credit_deduction_failure">[]> {
	const adminClient = createAdminClient();

	let query = adminClient
		.from("credit_deduction_failure")
		.select("*")
		.eq("resolved", false)
		.order("created_at", { ascending: false })
		.limit(options?.limit ?? 100);

	if (organizationId) {
		query = query.eq("organization_id", organizationId);
	}

	const { data, error } = await query;

	if (error) {
		throw new CreditBalanceError(`Failed to get deduction failures: ${error.message}`);
	}

	return data ?? [];
}

/**
 * Mark a deduction failure as resolved
 */
export async function resolveDeductionFailure(
	failureId: string,
	resolvedBy: string,
	notes?: string,
): Promise<void> {
	const adminClient = createAdminClient();

	const { error } = await adminClient
		.from("credit_deduction_failure")
		.update({
			resolved: true,
			resolved_at: new Date().toISOString(),
			resolved_by: resolvedBy,
			resolution_notes: notes,
		})
		.eq("id", failureId);

	if (error) {
		throw new CreditBalanceError(`Failed to resolve deduction failure: ${error.message}`);
	}
}
