<script>
    import {
        Container,
        Row,
        Col,
        Card,
        CardBody,
        CardHeader,
        Button,
        Input,
        Label,
        FormGroup,
        Modal,
        ModalHeader,
        ModalBody,
        ModalFooter,
        Alert,
        Spinner,
    } from "@sveltestrap/sveltestrap";
    import { authClient } from "$lib/client/auth/auth-client";
	import PageHeader from '$lib/components/portal/PageHeader.svelte';
    import { formatNameForDisplay } from "$lib/utils/text.js";
    import { _ } from 'svelte-i18n';

    // --- State ---
    const session = authClient.useSession();

    // Modals & Loading States
    let pwModalOpen = false;
    let isLoading = false;
    let message = { text: "", type: "success" }; // For success/error alerts
    const roleNames = {
        admin: 'role.admin',
        professor: 'role.professor',
        student: 'role.student',
    };
    $: role = roleNames[$session.data?.user.role] ? $_(roleNames[$session.data?.user.role]) : $_('role.user');

    // Password Form Data
    let pwData = { current: "", new: "", confirm: "" };

    // Password visibility toggles
    let showCurrent = false;
    let showNew = false;
    let showConfirm = false;
    let passwordCopied = false;

    // Password generator
    const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    const DIGITS = "0123456789";
    const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

    function generateStrongPassword() {
        const length = 16;
        const allChars = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;
        const mandatory = [
            UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
            UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
            LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
            LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
            DIGITS[Math.floor(Math.random() * DIGITS.length)],
            DIGITS[Math.floor(Math.random() * DIGITS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        ];
        const rest = Array.from(
            { length: length - mandatory.length },
            () => allChars[Math.floor(Math.random() * allChars.length)]
        );
        const arr = [...mandatory, ...rest];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        pwData.new = arr.join("");
        pwData.confirm = "";
        showNew = true;
    }

    async function copyNewPassword() {
        if (!pwData.new) return;
        const copied = await navigator.clipboard
            .writeText(pwData.new)
            .then(() => true)
            .catch(() => false);
        if (!copied) return;

        passwordCopied = true;
        setTimeout(() => (passwordCopied = false), 2000);
    }

    $: passwordStrength = (() => {
        if (!pwData.new) return { score: 0, label: "", color: "" };
        let score = 0;
        if (pwData.new.length >= 12) score++;
        if (pwData.new.length >= 16) score++;
        if (/[A-Z]/.test(pwData.new)) score++;
        if (/[a-z]/.test(pwData.new)) score++;
        if (/[0-9]/.test(pwData.new)) score++;
        if (/[^A-Za-z0-9]/.test(pwData.new)) score++;
        if (score <= 2)
			return { score, label: 'password.weak', color: "danger", hex: "var(--portal-danger)" };
        if (score <= 4)
            return {
                score,
				label: 'password.fair',
                color: "warning",
                hex: "var(--portal-warning)",
            };
		return { score, label: 'password.strong', color: "success", hex: "var(--portal-positive)" };
    })();

    // --- Actions ---
    const togglePwModal = () => {
        pwModalOpen = !pwModalOpen;
        pwData = { current: "", new: "", confirm: "" }; // Reset form
        showCurrent = false;
        showNew = false;
        showConfirm = false;
        passwordCopied = false;
        message.text = "";
    };

    async function handleChangePassword() {
        if (pwData.new !== pwData.confirm) {
            message = {
				text: $_('password.mismatch'),
                type: "danger",
            };
            return;
        }

        isLoading = true;
        try {
            const { error } = await authClient.changePassword({
                currentPassword: pwData.current,
                newPassword: pwData.new,
                revokeOtherSessions: true,
            });

            if (error) throw error;

            message = {
				text: $_('profile.passwordSuccess'),
                type: "success",
            };

            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            message = {
                text:
                    err.message ||
					$_('profile.passwordError'),
                type: "danger",
            };
        } finally {
            isLoading = false;
        }
    }

</script>

<svelte:head>
	<title>{$_('profile.title')} | {$_('site.name')}</title>
</svelte:head>

<div class="page-content">
<Container class="py-4">
	<PageHeader title={$_('profile.title')} subtitle={$_('profile.subtitle')} parentLabel={$_('common.portal')} parentHref="/corsi" />
    {#if $session.isPending}
        <div class="text-center">
            <Spinner color="primary" />
        </div>
    {:else if $session.data}
		<Row>
            <Col lg="8" class="mb-4">
                <Card class="h-100 shadow-sm">
                    <CardHeader>
						<h2 class="card-title h5 m-0">{$_('profile.personalInfo')}</h2>
                    </CardHeader>
                    <CardBody>
                        <Alert color="info">
							<strong>{$_('profile.note')}</strong> {$_('profile.editInfoHelp')}
							<a href="/supporto" class="alert-link">{$_('profile.here')}</a>.
                        </Alert>

                        <Row class="mb-3">
                            <Col md="6">
                                <FormGroup>
                                    <Label
                                        class="text-muted mb-1 small fw-semibold"
										>{$_('common.name')}</Label
                                    >
                                    <div class="fs-6 fw-medium">
                                        {formatNameForDisplay(
                                            $session.data.user.name
                                        ) || "-"}
                                    </div>
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label
                                        class="text-muted mb-1 small fw-semibold"
										>{$_('common.surname')}</Label
                                    >
                                    <div class="fs-6 fw-medium">
                                        {formatNameForDisplay(
                                            $session.data.user.surname
                                        ) || "-"}
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row class="mb-3">
                            <Col md="12">
                                <FormGroup>
                                    <Label
                                        class="text-muted mb-1 small fw-semibold"
										>{$_('profile.emailAddress')}</Label
                                    >
                                    <div class="fs-6 fw-medium">
                                        {$session.data.user.email}
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label
                                        class="text-muted mb-1 small fw-semibold"
										>{$_('common.role')}</Label
                                    >
                                    <div class="fs-6 fw-medium">{role}</div>
                                </FormGroup>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            </Col>

			<Col lg="4" class="mb-4">
				<Card class="h-100 shadow-sm">
					<CardHeader>
						<h2 class="card-title h5 m-0">{$_('profile.security')}</h2>
                    </CardHeader>
                    <CardBody class="d-flex flex-column gap-3">
                        <div>
                            <h3 class="h6">Password</h3>
							<p class="text-muted small">{$_('profile.lastChangedNever')}</p>
                            <Button
                                outline
                                color="dark"
                                class="w-100"
                                on:click={togglePwModal}
                            >
								{$_('password.change')}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </Row>
    {:else}
        <Alert color="warning"
			>{$_('profile.loginRequired')}</Alert
        >
    {/if}
</Container>
</div>

<Modal isOpen={pwModalOpen} toggle={togglePwModal}>
	<ModalHeader toggle={togglePwModal}>{$_('password.change')}</ModalHeader>
    <ModalBody>
        {#if message.text}
            <Alert color={message.type}>{message.text}</Alert>
        {/if}

        <FormGroup>
		<Label for="current-password">{$_('password.current')}</Label>
            <div class="input-group">
                <Input
					id="current-password"
                    type={showCurrent ? "text" : "password"}
					autocomplete="current-password"
                    bind:value={pwData.current}
                />
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => (showCurrent = !showCurrent)}
					title={$_(showCurrent ? 'common.hide' : 'common.show')}
					aria-label={$_(showCurrent ? 'common.hide' : 'common.show')}
                >
                    <i
                        class={showCurrent ? "ri-eye-off-line" : "ri-eye-line"}
                    ></i>
                </button>
            </div>
        </FormGroup>

        <FormGroup>
		<Label for="new-password">{$_('password.new')}</Label>
            <div class="input-group">
                <Input
					id="new-password"
                    type={showNew ? "text" : "password"}
                    bind:value={pwData.new}
                    autocomplete="new-password"
                />
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => (showNew = !showNew)}
					title={$_(showNew ? 'common.hide' : 'common.show')}
					aria-label={$_(showNew ? 'common.hide' : 'common.show')}
                >
                    <i class={showNew ? "ri-eye-off-line" : "ri-eye-line"}></i>
                </button>
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={copyNewPassword}
                    disabled={!pwData.new}
					title={$_('password.copy')}
					aria-label={$_('password.copy')}
                >
                    <i
                        class={passwordCopied
                            ? "ri-check-line text-success"
                            : "ri-file-copy-line"}
                    ></i>
                </button>
                <button
                    type="button"
                    class="btn btn-primary"
                    on:click={generateStrongPassword}
					title={$_('password.generateSecure')}
					aria-label={$_('password.generateSecure')}
                >
					<i class="ri-shield-keyhole-line me-1"></i> {$_('common.generate')}
                </button>
            </div>

            {#if pwData.new}
                <div class="mt-2">
                    <div class="d-flex gap-1 mb-1">
                        {#each [0, 1, 2, 3, 4, 5] as i}
                            <div
                                class="flex-fill rounded"
                                style="height: 4px; background-color: {i <
                                passwordStrength.score
                                    ? passwordStrength.hex
                                    : '#dee2e6'};"
                            ></div>
                        {/each}
                    </div>
                    <small class="text-{passwordStrength.color} fw-semibold"
						>{$_(passwordStrength.label)}</small
                    >
                    <small class="text-muted ms-2"
						>{$_('password.characters', { values: { count: pwData.new.length } })}</small
                    >
                </div>
            {/if}
        </FormGroup>

        <FormGroup>
		<Label for="confirm-password">{$_('password.confirmNew')}</Label>
            <div class="input-group">
                <Input
					id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    bind:value={pwData.confirm}
                    invalid={pwData.new !== "" &&
                        pwData.confirm !== "" &&
                        pwData.new !== pwData.confirm}
                />
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => (showConfirm = !showConfirm)}
					title={$_(showConfirm ? 'common.hide' : 'common.show')}
					aria-label={$_(showConfirm ? 'common.hide' : 'common.show')}
                >
                    <i
                        class={showConfirm ? "ri-eye-off-line" : "ri-eye-line"}
                    ></i>
                </button>
            </div>
            {#if pwData.new !== "" && pwData.confirm !== "" && pwData.new !== pwData.confirm}
                <div class="text-danger small mt-1">
					{$_('password.mismatch')}
                </div>
            {/if}
        </FormGroup>
    </ModalBody>
    <ModalFooter>
		<Button color="secondary" on:click={togglePwModal}>{$_('common.cancel')}</Button>
        <Button
            color="primary"
            on:click={handleChangePassword}
            disabled={isLoading}
        >
            {#if isLoading}
                <Spinner size="sm" />
            {:else}
				{$_('password.update')}
            {/if}
        </Button>
    </ModalFooter>
</Modal>
