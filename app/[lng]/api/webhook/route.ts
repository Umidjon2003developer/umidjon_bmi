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
		console.error('Webhook secret is missing in environment variables.')
		return new Response('Server configuration error', { status: 500 })
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
	} catch (error) {
		console.error('Failed to parse JSON payload:', error)
		return new Response('Invalid JSON payload', { status: 400 })
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
		return new Response('Invalid signature', { status: 400 })
	}

	const eventType = evt.type

	// ✅ Tip bilan kiritilgan userData
	const userData = evt.data as {
		id: string
		email_addresses: { email_address: string }[]
		image_url: string
		first_name: string
		last_name: string
	}

	const { id, email_addresses, image_url, first_name, last_name } = userData
	const email = email_addresses?.[0]?.email_address || ''
	const fullName = [first_name, last_name].filter(Boolean).join(' ')

	try {
		if (eventType === 'user.created') {
			const user = await createUser({
				clerkId: id,
				email,
				fullName,
				picture: image_url,
			})

			await sendNotification(id, 'messageWelcome')

			return NextResponse.json({ message: 'User created', user })
		}

		if (eventType === 'user.updated') {
			const user = await updateUser({
				clerkId: id,
				updatedData: {
					email,
					fullName,
					picture: image_url,
				},
			})

			await sendNotification(id, 'messageProfileUpdated')

			return NextResponse.json({ message: 'User updated', user })
		}

		return new Response('Event type not handled', { status: 200 })
	} catch (err) {
		console.error('Error processing event:', err)
		return new Response('Internal server error', { status: 500 })
	}
}
