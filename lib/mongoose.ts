import mongoose, { ConnectOptions } from 'mongoose'

let isConnected = false

export const connectToDatabase = async () => {
	mongoose.set('strictQuery', true)

	const mongoUrl = process.env.MONGODB_URL
	const dbName = process.env.MONGODB_DB

	if (!mongoUrl || !dbName) {
		console.error('❌ MONGODB_URL yoki MONGODB_DB topilmadi. .env faylni tekshiring.')
		return
	}

	if (isConnected) {
		console.log('✅ MongoDB already connected')
		return
	}

	try {
		const options: ConnectOptions = {
			dbName: dbName,
			autoCreate: true,
		}

		await mongoose.connect(mongoUrl, options)
		isConnected = true
		console.log('✅ MongoDB connected')
	} catch (error) {
		console.error('❌ MongoDB connection failed:', error)
	}
}
