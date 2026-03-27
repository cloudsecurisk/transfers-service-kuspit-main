import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client.ts'
import { AppError } from './error-handler.ts'
import { appConfig } from '../config/config.instance.ts'

// 0. Validation of DB enviroment variables
const dbHost = appConfig.get<string>('db.host')
const dbUser = appConfig.get<string>('db.user')
const dbPassword = appConfig.get<string>('db.password')
const dbSchema = appConfig.get<string>('db.schema')

if (!dbHost || !dbUser || !dbPassword || !dbSchema) {
  throw new AppError(500, 'Missing required database environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_SCHEMA')
}

// 1. Adapter configuration
const adapter = new PrismaMariaDb({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbSchema,
  connectionLimit: 5,
})

// 2. Singleton pattern
export const prisma = new PrismaClient({ adapter })
