'use server'

import { connectToDatabase } from '@/lib/mongoose'
import { GetPaginationParams, ICreateUser, IUpdateUser } from './types'
import User from '@/database/user.model'
import Review from '@/database/review.model'
import Course from '@/database/course.model'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'

// ✅ Foydalanuvchi yaratish yoki yangilash
export const createUser = async (data: ICreateUser) => {
	try {
		await connectToDatabase()
		const { clerkId, email, fullName, picture } = data
		const isExist = await User.findOne({ clerkId })

		if (isExist) {
			const updatedUser = await User.findOneAndUpdate(
				{ email },
				{ fullName, picture, clerkId },
				{ new: true }
			)
			return updatedUser
		}

		const newUser = await User.create(data)
		return newUser
	} catch (error) {
		console.error('Error in createUser:', error)
		throw new Error('Error creating user. Please try again.')
	}
}

// ✅ Foydalanuvchi ma’lumotlarini yangilash
export const updateUser = async (data: IUpdateUser) => {
	try {
		await connectToDatabase()
		const { clerkId, updatedData, path } = data
		const updatedUser = await User.findOneAndUpdate({ clerkId }, updatedData, { new: true })
		if (path) revalidatePath(path)
		return updatedUser
	} catch (error) {
		console.error('Error in updateUser:', error)
		throw new Error('Error updating user. Please try again.')
	}
}

// ✅ Foydalanuvchini ID orqali olish (cached)
export const getUserById = cache(async (clerkId: string) => {
	try {
		await connectToDatabase()
		return await User.findOne({ clerkId })
	} catch (error) {
		console.error('Error in getUserById:', error)
		throw new Error('Error fetching user. Please try again.')
	}
})

// ✅ Foydalanuvchini olish (minimum info bilan)
export const getUser = async (clerkId: string) => {
	try {
		await connectToDatabase()
		const user = await User.findOne({ clerkId }).select(
			'fullName picture clerkId email role isAdmin'
		)
		if (!user) return 'notFound'
		return JSON.parse(JSON.stringify(user))
	} catch (error) {
		console.error('Error in getUser:', error)
		throw new Error('Error fetching user. Please try again.')
	}
}

// ✅ Foydalanuvchining barcha sharhlarini olish
export const getUserReviews = async (clerkId: string) => {
	try {
		await connectToDatabase()
		const user = await User.findOne({ clerkId }).select('_id')

		const reviews = await Review.find({ user: user._id })
			.sort({ createdAt: -1 })
			.populate({ path: 'user', model: User, select: 'fullName picture' })
			.populate({ path: 'course', model: Course, select: 'title' })

		return reviews
	} catch (error) {
		console.error('Error in getUserReviews:', error)
		throw new Error('Error getting user reviews')
	}
}

// ✅ Admin panel uchun o‘qituvchilar ro‘yxatini olish (pagination bilan)
export const getAdminInstructors = async (params: GetPaginationParams) => {
	try {
		await connectToDatabase()
		const { page = 1, pageSize = 3 } = params
		const skipAmount = (page - 1) * pageSize

		const instructors = await User.find({ role: 'instructor' })
			.skip(skipAmount)
			.limit(pageSize)
			.sort({ createdAt: -1 })

		const totalInstructors = await User.countDocuments({ role: 'instructor' })
		const isNext = totalInstructors > skipAmount + instructors.length

		return { instructors, isNext, totalInstructors }
	} catch (error) {
		console.error('Error in getAdminInstructors:', error)
		throw new Error('Error getting instructors')
	}
}

// ✅ Faqat tasdiqlangan o‘qituvchilarni olish
export const getInstructors = async () => {
	try {
		await connectToDatabase()
		return await User.find({ approvedInstructor: true }).select(
			'isAdmin role email website youtube github job clerkId'
		)
	} catch (error) {
		console.error('Error in getInstructors:', error)
		throw new Error('Error getting instructors')
	}
}

// ✅ Foydalanuvchining roli va adminlik maqomini olish
export const getRole = async (clerkId: string) => {
	try {
		await connectToDatabase()
		const user = await User.findOne({ clerkId }).select('role isAdmin')
		return user
	} catch (error) {
		console.error('Error in getRole:', error)
		throw new Error('Error getting role')
	}
}
