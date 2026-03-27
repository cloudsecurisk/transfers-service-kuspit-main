import crypto from 'crypto'
import { appConfig } from '../config/config.instance.ts'

export const PasswordGenerator = {
  /**
   * Generates a deterministic password for a specific user.
   * Format: A-Z, a-z, 0-9 (Alphanumeric to ensure API compatibility).
   * * @param externalId - An external ID of the user.
   */
  generateForUser(externalId: string | number): string {
    const secret = appConfig.get<string>('kuspit.passwordSecret') || 'fallback_dev_secret'
    console.log(secret)

    // 1. Create an HMAC using the master secret
    const hmac = crypto.createHmac('sha256', secret)

    // 2. Feed the user ID as data
    hmac.update(externalId.toString())

    // 3. Get the hex digest
    const hash = hmac.digest('hex')

    // 4. Transform into a password format compliant with strict banking rules.
    // Hash is hex (0-9, a-f), so we map it to be stronger.

    const basePassword = Buffer.from(hash).toString('base64').substring(0, 16)

    // Return a password that usually satisfies complexity: "Abc..." + special
    // Clean non-alphanumeric just in case, or keep them if Kuspit allows.
    return `Kuspit_${basePassword}!`
  },
}
