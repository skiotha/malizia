export function onReady(data: unknown): void {
	const { user } = data as { user: { username: string } };
	console.log(`Logged in as ${user.username}`);
}
