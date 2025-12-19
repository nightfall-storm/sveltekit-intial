<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import {
		Field,
		FieldContent,
		FieldError,
		FieldLabel,
		FieldSet
	} from '$lib/components/ui/field/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import type { LoginActionState } from '../common/actions/login.action.js';
	import type { LoginInput } from '../common/schemas/login.schema.js';
	import type { SubmitFunction } from '@sveltejs/kit';

	type Props = {
		form?: LoginActionState;
	};

	let { form }: Props = $props();

	let email = $state('');
	let password = $state('');
	let isPending = $state(false);
	let errors = $state<Partial<Record<keyof LoginInput, { message: string }>>>({});

	$effect(() => {
		if (form) {
			if (form.success) {
				toast.success('Logged in successfully');
				goto('/dashboard/support/orders', { replaceState: true });
				return;
			}

			toast.error(form.message ?? form.error ?? 'Failed to login');

			if (form.issues) {
				const newErrors: Partial<Record<keyof LoginInput, { message: string }>> = {};
				Object.entries(form.issues).forEach(([name, errorMessages]) => {
					if (errorMessages && errorMessages.length > 0) {
						newErrors[name as keyof LoginInput] = {
							message: errorMessages[0]
						};
					}
				});
				errors = newErrors;
			} else {
				errors = {};
			}
		}
	});

	const handleSubmit: SubmitFunction = () => {
		isPending = true;
		errors = {};

		return async ({ result, update }) => {
			isPending = false;

			if (result.type === 'redirect') {
				return;
			}

			if (result.type === 'failure' && result.data) {
				const data = result.data as LoginActionState;
				if (data.success) {
					toast.success('Logged in successfully');
					await goto('/dashboard/support/orders', { replaceState: true });
					return;
				}

				toast.error(data.message ?? data.error ?? 'Failed to login');

				if (data.issues) {
					const newErrors: Partial<Record<keyof LoginInput, { message: string }>> = {};
					Object.entries(data.issues).forEach(([name, errorMessages]) => {
						if (errorMessages && errorMessages.length > 0) {
							newErrors[name as keyof LoginInput] = {
								message: errorMessages[0]
							};
						}
					});
					errors = newErrors;
				}
			}

			await update();
		};
	};
</script>

<div class="flex w-full flex-col gap-6">
	<Card>
		<CardHeader class="text-center">
			<CardTitle class="text-xl">Welcome back</CardTitle>
			<CardDescription>Sign in to your account</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-6">
				<form method="POST" action="?/login" use:enhance={handleSubmit} class="grid gap-6">
					<FieldSet>
						<Field>
							<FieldLabel for="email">Email</FieldLabel>
							<FieldContent>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="johndoe@example.com"
									autocomplete="email"
									class="h-11 rounded-lg"
									bind:value={email}
									aria-invalid={errors.email ? 'true' : undefined}
								/>
								<FieldError errors={errors.email ? [errors.email] : undefined} />
							</FieldContent>
						</Field>

						<Field>
							<FieldLabel for="password">Password</FieldLabel>
							<FieldContent>
								<Input
									id="password"
									name="password"
									type="password"
									placeholder="••••••••"
									autocomplete="current-password"
									class="h-11 rounded-lg"
									bind:value={password}
									aria-invalid={errors.password ? 'true' : undefined}
								/>
								<FieldError errors={errors.password ? [errors.password] : undefined} />
							</FieldContent>
						</Field>
					</FieldSet>

					<Button type="submit" class="h-11 w-full rounded-lg" disabled={isPending}>
						{isPending ? 'Signing in...' : 'Sign in'}
						{#if isPending}
							<Spinner class="size-4" />
						{/if}
					</Button>
				</form>

				<div class="mt-4">
					<a href="/login-stores-manager">
						<Button variant="outline" class="h-11 w-full rounded-lg">
							Sign in as Store Manager
						</Button>
					</a>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
