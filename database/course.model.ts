import { Schema, model, models } from 'mongoose'

const CourseSchema = new Schema(
	{
		title: String,
		description: String,
		learning: String,
		requirements: String,
		level: String,
		cateogry: String,
		language: String,
		oldPrice: Number,
		currentPrice: Number,
		previewImage: String,
		published: { type: Boolean, default: false },
	},
	{ timestamps: true }
)

const Course = models.Course || model('Course', CourseSchema)
export default Course
