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
		console.error('❌ WEBHOOK_SECRET missing')
		throw new Error(
			'Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
		)
	}

	const headerPayload = headers()
	const svixId = headerPayload.get('svix-id')
	const svixTimestamp = headerPayload.get('svix-timestamp')
	const svixSignature = headerPayload.get('svix-signature')

	if (!svixId || !svixTimestamp || !svixSignature) {
		console.error('❌ Missing svix headers')
		return new Response('Error occured -- no svix headers', {
			status: 400,
		})
	}

	const payload = await req.json()
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
		console.error('❌ Error verifying webhook:', err)
		return new Response('Error occured', {
			status: 400,
		})
	}

	console.log('✅ Webhook received:', evt.type)
	console.log('📦 Event data:', JSON.stringify(evt.data, null, 2))

	const eventType = evt.type

	if (eventType === 'user.created') {
		try {
			const { id, email_addresses, image_url, first_name, last_name } = evt.data

			const email =
				email_addresses && email_addresses.length > 0
					? email_addresses[0].email_address
					: ''

			const user = await createUser({
				clerkId: id,
				email,
				fullName: `${first_name || ''} ${last_name || ''}`.trim(),
				picture: image_url,
			})

			await sendNotification(id, 'messageWelcome')

			return NextResponse.json({ message: 'OK', user })
		} catch (error) {
			console.error('❌ Error in user.created handler:', error)
			return new Response('Error processing user.created', {
				status: 500,
			})
		}
	}

	if (eventType === 'user.updated') {
		try {
			const { id, email_addresses, image_url, first_name, last_name } = evt.data

			const email =
				email_addresses && email_addresses.length > 0
					? email_addresses[0].email_address
					: ''

			const user = await updateUser({
				clerkId: id,
				updatedData: {
					email,
					fullName: `${first_name || ''} ${last_name || ''}`.trim(),
					picture: image_url,
				},
			})

			await sendNotification(id, 'messageProfileUpdated')

			return NextResponse.json({ message: 'OK', user })
		} catch (error) {
			console.error('❌ Error in user.updated handler:', error)
			return new Response('Error processing user.updated', {
				status: 500,
			})
		}
	}

	return new Response('Unhandled event type', { status: 400 })
}
