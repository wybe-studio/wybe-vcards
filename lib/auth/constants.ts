import type { OrganizationMemberRole } from "@/types/organization-member-role";

/**
 * Header name for passing captcha token to Better Auth endpoints.
 * Used by the captcha plugin to validate requests.
 */
export const CAPTCHA_RESPONSE_HEADER = "x-captcha-response";

/**
 * Human-readable labels for organization member roles.
 */
export const organizationMemberRoleLabels = {
	member: "Membro",
	owner: "Proprietario",
	admin: "Admin",
} as const satisfies Record<OrganizationMemberRole, string>;

/**
 * Human-readable error messages for auth error codes.
 */
export const authErrorMessages: Record<string, string> = {
	INVALID_EMAIL_OR_PASSWORD: "Email o password non corretti.",
	USER_NOT_FOUND: "Questo utente non esiste.",
	FAILED_TO_CREATE_USER: "Impossibile creare l'utente. Riprova più tardi.",
	FAILED_TO_CREATE_SESSION:
		"Impossibile creare la sessione. Riprova più tardi.",
	FAILED_TO_UPDATE_USER: "Impossibile aggiornare l'utente. Riprova più tardi.",
	FAILED_TO_GET_SESSION: "Impossibile ottenere la sessione.",
	INVALID_PASSWORD: "La password inserita non è corretta.",
	INVALID_EMAIL: "Email o password non corretti.",
	INVALID_TOKEN: "Il token inserito non è valido o è scaduto.",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "Account non trovato.",
	EMAIL_CAN_NOT_BE_UPDATED:
		"Impossibile aggiornare l'email. Riprova più tardi.",
	EMAIL_NOT_VERIFIED:
		"Ti abbiamo inviato un link di verifica. Controlla la tua casella di posta e verificalo.",
	FAILED_TO_GET_USER_INFO: "Impossibile caricare le informazioni utente.",
	ID_TOKEN_NOT_SUPPORTED: "L'ID token non è supportato.",
	PASSWORD_TOO_LONG: "La password è troppo lunga.",
	PASSWORD_TOO_SHORT: "La password è troppo corta.",
	PROVIDER_NOT_FOUND: "Questo provider non è supportato.",
	SOCIAL_ACCOUNT_ALREADY_LINKED: "Questo account è già collegato a un utente.",
	USER_EMAIL_NOT_FOUND: "Email non trovata.",
	USER_ALREADY_EXISTS: "Questo indirizzo email è già in uso.",
	INVALID_INVITATION: "L'invito non è valido o è scaduto.",
	SESSION_EXPIRED: "La sessione è scaduta.",
	FAILED_TO_UNLINK_LAST_ACCOUNT: "Impossibile scollegare l'account.",
	ACCOUNT_NOT_FOUND: "Account non trovato.",
	USER_BANNED:
		"Il tuo account è stato sospeso. Contatta il supporto per assistenza.",
};

/**
 * Get a human-readable error message for an auth error code.
 */
export function getAuthErrorMessage(errorCode: string | undefined): string {
	return (
		authErrorMessages[errorCode as keyof typeof authErrorMessages] ||
		"Si è verificato un errore. Riprova più tardi."
	);
}

/**
 * Known Supabase Auth error messages mapped to Italian translations.
 */
const supabaseErrorTranslations: Record<string, string> = {
	"Invalid login credentials": "Credenziali di accesso non valide.",
	"Email not confirmed": "Email non confermata.",
	"User already registered": "Utente già registrato.",
	"Password should be at least 6 characters":
		"La password deve contenere almeno 6 caratteri.",
	"Email rate limit exceeded": "Limite di richieste email superato.",
	"For security purposes, you can only request this once every 60 seconds":
		"Per motivi di sicurezza, puoi effettuare questa richiesta solo una volta ogni 60 secondi.",
	"Unable to validate email address: invalid format":
		"Impossibile validare l'indirizzo email: formato non valido.",
	"Signup requires a valid password":
		"La registrazione richiede una password valida.",
	"New password should be different from the old password.":
		"La nuova password deve essere diversa dalla precedente.",
	"Auth session missing!": "Sessione di autenticazione mancante!",
	"User not found": "Utente non trovato.",
	"Invalid otp": "Codice OTP non valido.",
};

/**
 * Translate a raw Supabase Auth error message to Italian.
 * Returns the original message if no translation is found.
 */
export function translateSupabaseError(message: string): string {
	return supabaseErrorTranslations[message] || message;
}
