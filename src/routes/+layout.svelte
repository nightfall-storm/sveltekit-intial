<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<div class="app">
	<main>{@render children()}</main>
	<Toaster />
</div>
