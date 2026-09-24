<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import {
        apiListRequest,
        apiRequest,
        formatDateTime,
    } from "$lib/client/api.js";
    import PageHeader from "$lib/components/portal/PageHeader.svelte";
    let course;
    let activities = [];
    let loading = true;
    let errorMessage = "";
    let filter = "ALL";
    $: courseId = $page.params.id;
    $: filtered = activities.filter(
        (activity) => filter === "ALL" || activity.status === filter,
    );
    onMount(async () => {
        try {
            [course, activities] = await Promise.all([
                apiRequest(`/api/corsi/${courseId}`),
                apiListRequest(`/api/esercitazioni?courseId=${courseId}`),
            ]);
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    });
</script>

<svelte:head><title>Attività del corso</title></svelte:head>
<div class="page-content">
    <div class="container-fluid py-4">
        <PageHeader
            title="Attività"
            subtitle={course ? course.name : "Attività del corso"}
            parentHref={`/corsi/${courseId}`}
            parentLabel="Corso"
        />
        {#if errorMessage}<div class="alert alert-danger">
                {errorMessage}
            </div>{/if}
        <div class="card border-0 shadow-sm">
            <div
                class="card-header bg-transparent p-4 d-flex flex-wrap gap-3 justify-content-between align-items-center"
            >
                <div class="btn-group" role="group">
                    <button
                        class="btn {filter === 'ALL'
                            ? 'btn-primary'
                            : 'btn-light'}"
                        on:click={() => (filter = "ALL")}>Tutte</button
                    ><button
                        class="btn {filter === 'PUBLISHED'
                            ? 'btn-primary'
                            : 'btn-light'}"
                        on:click={() => (filter = "PUBLISHED")}
                        >Pubblicate</button
                    ><button
                        class="btn {filter === 'DRAFT'
                            ? 'btn-primary'
                            : 'btn-light'}"
                        on:click={() => (filter = "DRAFT")}>Bozze</button
                    >
                </div>
                {#if course?.canManage}<a
                        class="btn btn-success"
                        href={`/corsi/${courseId}/esercitazioni/aggiungi`}
                        ><i class="ri-add-line me-1"></i>Nuova attività</a
                    >{/if}
            </div>
            <div class="card-body p-0">
                {#if loading}<div class="text-center py-5">
                        <div class="spinner-border text-primary"></div>
                    </div>{:else if filtered.length === 0}<div
                        class="text-center text-muted py-5"
                    >
                        Nessuna attività disponibile.
                    </div>{:else}<div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light"
                                ><tr
                                    ><th class="ps-4">Attività</th><th
                                        >Tipologia</th
                                    ><th>Disponibilità</th><th>Stato</th><th
                                        class="text-end pe-4">Azioni</th
                                    ></tr
                                ></thead
                            ><tbody
                                >{#each filtered as activity}<tr
                                        ><td class="ps-4"
                                            ><div class="fw-semibold">
                                                {activity.title}
                                            </div>
                                            <small class="text-muted"
                                                >{activity.objective}</small
                                            ></td
                                        ><td
                                            >{activity.kind === "EXAM"
                                                ? "Esame"
                                                : "Esercitazione"}</td
                                        ><td
                                            ><small
                                                >{formatDateTime(
                                                    activity.availableFrom,
                                                )}<br />{formatDateTime(
                                                    activity.availableUntil,
                                                )}</small
                                            ></td
                                        ><td
                                            ><span
                                                class="badge {activity.status ===
                                                'PUBLISHED'
                                                    ? 'bg-success-subtle text-success'
                                                    : activity.status ===
                                                        'DRAFT'
                                                      ? 'bg-warning-subtle text-warning'
                                                      : 'bg-secondary-subtle text-secondary'}"
                                                >{activity.status}</span
                                            ></td
                                        ><td class="text-end pe-4"
                                            ><a
                                                class="btn btn-sm btn-primary"
                                                href={`/corsi/${courseId}/esercitazioni/${activity.id}`}
                                                >Apri</a
                                            >{#if course?.canManage}<a
                                                    class="btn btn-sm btn-light ms-1"
                                                    aria-label={`Modifica ${activity.title}`}
                                                    href={`/corsi/${courseId}/esercitazioni/${activity.id}/modifica`}
                                                    ><i class="ri-edit-line"
                                                    ></i></a
                                                >{/if}</td
                                        ></tr
                                    >{/each}</tbody
                            >
                        </table>
                    </div>{/if}
            </div>
        </div>
    </div>
</div>
