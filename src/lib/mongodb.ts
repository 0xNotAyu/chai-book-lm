import mongoose from 'mongoose'
import { env } from './env'

const connectMongoDB = async () => {
    try{
        await mongoose.connect(env.MONGO_URI)
        console.log("✅ mongodb connected")
    } catch (error) {
        console.error("❌ mongodb connection error", error)
        process.exit(1)
    }
}

export default connectMongoDB 