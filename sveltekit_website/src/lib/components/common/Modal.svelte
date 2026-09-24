<!-- Modal.svelte -->
<script>
    export let isOpen;
    // export let onClose;
    export let className;
</script>

{#if isOpen}
    <div class="modal">
        <!-- modal-dialog-centered -->
        <div class="modal-dialog {className}">
            <div class="modal-content border-0">
                <slot />
            </div>
        </div>
    </div>
{/if}

<style>
    /* Style your modal and modal content here */
    .modal {
        position: fixed;
        /* top: 0; */
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        /* align-items: center; */
        /* justify-content: center; */
    }

    .modal-content {
        background-color: white;
        border-radius: 5px;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.3);
    }

    .modal-dialog {
        width: 100%;
    }

</style>
