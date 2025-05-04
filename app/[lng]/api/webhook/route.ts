/* eslint-disable camelcase */
import { sendNotification } from '@/actions/notification.action'
import { createUser, updateUser } from '@/actions/user.action'
import { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.NEXT_CLERK_WEBHOOK_SECRET

	if (!WEBHOOK_SECRET) {
		console.error('WEBHOOK_SECRET is missing in environment variables')
		return new Response('Server error: missing webhook secret', { status: 500 })
	}

	const headerPayload = headers()
	const svixId = headerPayload.get('svix-id')
	const svixTimestamp = headerPayload.get('svix-timestamp')
	const svixSignature = headerPayload.get('svix-signature')

	if (!svixId || !svixTimestamp || !svixSignature) {
		return new Response('Missing Svix headers', { status: 400 })
	}

	let payload: any
	try {
		payload = await req.json()
	} catch (err) {
		console.error('Failed to parse JSON payload:', err)
		return new Response('Invalid JSON', { status: 400 })
	}

	const body = JSON.stringify(payload)

	const wh = new Webhook(WEBHOOK_SECRET)
	let evt: WebhookEvent

	try {
		evt = wh.verify(body, {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		}) as WebhookEvent
	} catch (err) {
		console.error('Webhook verification failed:', err)
		return new Response('Unauthorized webhook', { status: 400 })
	}

	const eventType = evt.type
	const userData = evt.data

	switch (eventType) {
		case 'user.created': {
			const { id, email_addresses, image_url, first_name, last_name } = userData
			const email = email_addresses?.[0]?.email_address || ''

			const user = await createUser({
				clerkId: id,
				email,
				fullName: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
				picture: image_url,
			})

			await sendNotification(id, 'messageWelcome')
			return NextResponse.json({ message: 'User created', user })
		}

		case 'user.updated': {
			const { id, email_addresses, image_url, first_name, last_name } = userData
			const email = email_addresses?.[0]?.email_address || ''

			const user = await updateUser({
				clerkId: id,
				updatedData: {
					email,
					fullName: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
					picture: image_url,
				},
			})

			await sendNotification(id, 'messageProfileUpdated')
			return NextResponse.json({ message: 'User updated', user })
		}

		default:
			console.log(`Unhandled webhook event: ${eventType}`)
			return new Response(`Unhandled event type: ${eventType}`, { status: 200 })
	}
}
