<script lang="ts">
	import LoginForm from '$lib/features/auth/components/LoginForm.svelte';
	import type { PageData } from './$types.js';
	import type { LoginActionState } from '$lib/features/auth/common/actions/login.action.js';

	let pageData: PageData & { form?: LoginActionState } = $props();
	let { form } = pageData;
</script>

<svelte:head>
	<title>Login</title>
	<meta name="description" content="Login page" />
</svelte:head>

<section>
	<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
		<div class="flex w-full max-w-md flex-col gap-6">
			<LoginForm {form} />
		</div>
	</div>
</section>
