function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

const templates = {
	'password-reset': ({ name, resetUrl }) => ({
		subject: 'Reimposta la tua password',
		message: `Ciao ${name ?? ''}, usa il link seguente per reimpostare la password:`,
		url: resetUrl,
		label: 'Reimposta password'
	}),
	'email-verification': ({ name, verificationUrl }) => ({
		subject: 'Verifica il tuo indirizzo email',
		message: `Ciao ${name ?? ''}, conferma il tuo indirizzo email:`,
		url: verificationUrl,
		label: 'Verifica email'
	}),
};

export function renderMailTemplate(templateName, data = {}) {
	const template = templates[templateName]?.(data) ?? {
		subject: 'Notifica POLITO',
		message: 'Hai ricevuto una nuova notifica.'
	};
	const safeMessage = escapeHtml(template.message);
	const safeUrl = template.url ? escapeHtml(template.url) : '';
	const link = safeUrl
		? `<p><a href="${safeUrl}">${escapeHtml(template.label ?? 'Apri')}</a></p>`
		: '';

	return {
		subject: template.subject,
		text: [template.message, template.url].filter(Boolean).join('\n\n'),
		html: `<div style="font-family:Arial,sans-serif"><p>${safeMessage}</p>${link}</div>`
	};
}
