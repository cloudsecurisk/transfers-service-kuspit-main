import { prisma } from '../shared/prisma.ts'
import { logger } from '../shared/logger.ts'
import { AppError } from '../shared/error-handler.ts'
import crypto from 'crypto'
import { PasswordGenerator } from '../shared/password-generator.ts'
import type {
  KuspitLinkParams,
  TokenRequestParams,
  TokenRefreshParams,
} from '../adapter/kuspit/auth.ts'
import { adapter } from '../adapter/kuspit.adapter.ts'

const KUSPIT_INSTITUTION_ID = 69

export interface IdentityContext {
  email: string
  idCommerce: number
  idDistributor?: number
  idExecutive?: number
}

export const KuspitAuthService = {
  /**
   * 🚀 MAIN ORCHESTRATOR - METHOD 1: ONBOARDING
   * Search or create based on user identity.
   * @param identity - User identity context.
   */
  async ensureKuspitConnection(identity: IdentityContext) {
    // 1. Identity Validation
    if (!identity.email || !identity.idCommerce) {
      throw new AppError(400, 'Identity information is missing (Email or Commerce)')
    }

    // 2. AGNOSTIC SEARCH
    // We search to see if this email already has a Kuspit account.
    let kuspitAccount = await prisma.account.findFirst({
      where: {
        idCommerce: identity.idCommerce,
        accountSetting: {
          some: { emailNotification: identity.email },
        },
        stpAccountClabe: {
          some: {
            clabe: { idInstitution: KUSPIT_INSTITUTION_ID },
          },
        },
      },
      include: { accountSetting: true,
        stpAccountClabe: true },
    })

    // =========================================================
    // CASE A: ALREADY HAVE AN ACCOUNT (We only validate the token)
    // =========================================================
    if (kuspitAccount) {
      const settings = kuspitAccount.accountSetting[0]

      if (settings?.kuspitAccessToken) {
        // Standard expiration logic
        const now = new Date()
        const expiresAt = settings.kuspitTokenExpiresAt || new Date(0)

        // If it expired, we refresh using the ID of the account found.
        if ((expiresAt.getTime() - (5 * 60 * 1000)) < now.getTime()) {
          return await this.refreshSession(kuspitAccount.id)
        }

        return {
          accessToken: settings.kuspitAccessToken,
          kuspitAccountId: kuspitAccount.id,
        }
      }
    }

    // =========================================================
    // CASE B: NO ACCOUNT (Create one)
    // =========================================================

    kuspitAccount = await prisma.account.create({
      data: {
        idCommerce: identity.idCommerce,
        idDistributor: identity.idDistributor || 1,
        idExecutive: identity.idExecutive || 1,
        idPlan: 2,
        commerceName: 'Kuspit Pending...', // Temporal
        bankAccount: 'PENDING', // Placeholder
        bankAccountOwner: identity.email, // Temporal
        balance: 0,
        // We create the empty setting to have somewhere to store the AuthCode later
        accountSetting: {
          create: {
            emailNotification: identity.email,
          },
        },
      },
      include: { accountSetting: true, stpAccountClabe: true },
    })

    logger.info(`Shell Account created with ID: ${kuspitAccount.id}. Initiating link with Kuspit...`)

    try {
      // We use the actual ID from the database as idExternal.
      const linkResult = await this.autoLinkClient(identity, kuspitAccount.id)

      // We exchange tokens and hydrate the account.
      return await this.exchangeCodeAndHydrateAccount(kuspitAccount.id, linkResult.code)
    }
    catch (error) {
      // MANUAL ROLLBACK
      // If the connection to Kuspit fails, we delete the “Shell” account so as not to leave any junk,
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Error in Kuspit, deleting shell account... ${message}`)
      await prisma.account.delete({ where: { id: kuspitAccount.id } })
      throw error
    }
  },

  /**
   * 🚀 MAIN ORCHESTRATOR - METHOD 2: OPERATIONS
   * Search by Account ID. Refresh token if necessary.
   * @param localAccountId - Local account ID.
   */
  async getValidSession(localAccountId: number) {
    // 1. Search for direct account settings by ID
    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })

    if (!account) throw new AppError(404, 'Account not found.')

    const settings = account.accountSetting[0]

    if (!settings || !settings.kuspitRefreshToken) {
      throw new AppError(401, 'The account does not have any Kuspit credentials linked to it (Auth missing).')
    }

    // 2. Expiration Logic
    const now = new Date()
    const expiresAt = settings.kuspitTokenExpiresAt || new Date(0)
    const FIVE_MINUTES = 5 * 60 * 1000

    // If it has already expired or is about to expire (5-minute buffer)
    if (expiresAt.getTime() - FIVE_MINUTES < now.getTime()) {
      logger.info({ localAccountId }, 'Token expirado o próximo a expirar. Refrescando...')
      return await this.refreshSession(localAccountId)
    }

    // 3. If valid, we return the current accessToken
    return {
      accessToken: settings.kuspitAccessToken!,
      kuspitAccountId: localAccountId,
    }
  },

  /**
   * Automatically gathers data and initiates linking with Kuspit.
   * @param identity - User identity context.
   */
  async autoLinkClient(identity: IdentityContext, realAccountId: number) {
    // 1. Generate a secure random state (Anti-CSRF)
    const generatedState = crypto.randomInt(100000, 999999)

    // 2. Prepare Params from Environment Variables and DB
    const idt = Number(process.env['KUSPIT_ID_EMPRESA'])
    const scope = process.env['KUSPIT_SCOPE']
    const client_id = process.env['KUSPIT_CLIENT_ID']
    const redirect_uri = process.env['KUSPIT_REDIRECT_URI']

    if (
      isNaN(idt)
      || typeof scope !== 'string'
      || typeof client_id !== 'string'
      || typeof redirect_uri !== 'string'
    ) {
      throw new AppError(500, 'Missing or invalid Kuspit environment variables')
    }

    const generatedPassword = PasswordGenerator.generateForUser(identity.email)

    const linkParams: KuspitLinkParams = {
      idt,
      scope,
      client_id,
      redirect_uri,
      response_type: 'code',
      state: generatedState,
      idExterno: realAccountId,
      correoLogin: identity.email,
      passwordLogin: generatedPassword,
      aceptaCond: 1,
      /* LEGAL NOTE:
        We explicitly set 'aceptaCond' to 1 (YES).
        This service is ONLY invoked after the user has explicitly asked
        for the Kuspit Service and has read the "Terms and Conditions".
        The invocation of this endpoint constitutes the digital evidence of consent.
      */
    }

    try {
      // 4. Call Adapter
      const result = await adapter.linkClient(linkParams)

      // 5. Security Check: Validate returned state matches generated state
      if (Number(result.state) !== generatedState) {
        throw new AppError(403, 'Security violation: state mismatch')
      }

      // 6. Persistence: Store the code in accountSetting (Temporal use)
      // Since your schema uses Decimal for some fields, we store it where appropriate
      // or simply pass it to the next step (Token Request).
      await prisma.accountSetting.updateMany({
        where: { idAccount: realAccountId },
        data: {
          kuspitAuthCode: result.code,
        },
      })

      logger.info({ realAccountId }, 'Client linked and Kuspit auth code persisted temporarily')

      return result
    }
    catch (error) {
      logger.error({ error, realAccountId }, 'Failed in autoLinkClient')
      throw error
    }
  },

  /**
   * Redeem the authorization code for tokens and update the account.
   * @param accountId - Local account ID.
   * @param code - The code obtained from linkClient (optional if already in the database).
   * @param email - User email for updating settings.
   */
  async exchangeCodeAndHydrateAccount(accountId: number, code?: string) {
    // 1. If it doesn't have the code, we look for it in the DB (where we saved it in the previous step).
    let authCode = code

    if (!authCode) {
      const settings = await prisma.accountSetting.findFirst({
        where: { idAccount: accountId },
        select: { kuspitAuthCode: true },
      })

      if (!settings?.kuspitAuthCode) {
        throw new AppError(400, 'No auth code found for this user. Please link client first.')
      }
      authCode = settings.kuspitAuthCode
    }

    // 2. Prepare payload for the Adapter
    const client_id = process.env['KUSPIT_CLIENT_ID']
    const client_secret = process.env['KISPIT_CLIENT_SECRET']
    const redirect_uri = process.env['KUSPIT_REDIRECT_URI']

    if (
      typeof client_id !== 'string'
      || typeof client_secret !== 'string'
      || typeof redirect_uri !== 'string'
    ) {
      throw new AppError(500, 'Missing or invalid Kuspit environment variables')
    }

    const tokenParams: TokenRequestParams = {
      grant_type: 'authorization_code',
      client_id: client_id,
      client_secret: client_secret,
      redirect_uri: redirect_uri,
      code: authCode,
    }

    // 3. Call to the Adapter (Kuspit API)
    const tokenResponse = await adapter.requestToken(tokenParams)

    logger.info({ accountId }, '✅ Tokens successfully obtained from Kuspit.')

    // 4. UPDATE the existing account (Hydration).
    return await prisma.$transaction(async (tx) => {
      // A. We update Settings with Tokens
      await tx.accountSetting.updateMany({
        where: { idAccount: accountId },
        data: {
          kuspitAccessToken: tokenResponse.access_token,
          kuspitRefreshToken: tokenResponse.refresh_token,
          kuspitTokenExpiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)),
          kuspitAuthCode: null,
        },
      })

      // B. Create or Hydrate the CLABE record
      let savedClabe = null

      if (tokenResponse.clabeKuspit) {
        const existingLink = await tx.stpAccountClabe.findFirst({
          where: { idAccount: accountId },
          include: { clabe: true },
        })

        if (!existingLink) {
          logger.info({ accountId }, 'First time CLABE received from Auth, saving...')

          const newClabe = await tx.clabe.create({
            data: {
              clabe: tokenResponse.clabeKuspit,
              idInstitution: KUSPIT_INSTITUTION_ID, // Kuspit
              idClabeType: 3, // CLABE
            },
          })

          // C. VINCULATE the CLABE with the account
          await tx.stpAccountClabe.create({
            data: {
              idAccount: accountId,
              idClabe: newClabe.id,
            },
          })

          // await tx.account.update({
          //   where: { id: accountId },
          //   data: { bankAccount: tokenResponse.clabeKuspit }
          // }) -> CHECAR MARIO

          savedClabe = tokenResponse.clabeKuspit
        }
        else {
          // CASO: Ya tenemos CLABE.
          if (existingLink.clabe.clabe !== tokenResponse.clabeKuspit) {
            logger.warn({ accountId }, 'Kuspit returned a different CLABE than stored. Updating...')
            await tx.clabe.update({
              where: { id: existingLink.idClabe },
              data: { clabe: tokenResponse.clabeKuspit },
            })
          }
          savedClabe = existingLink.clabe.clabe
        }
      }

      logger.info(`Successful linking. Account: ${accountId}`)

      if (!savedClabe) {
        logger.info({ accountId }, 'No CLABE received from Kuspit during linking. CLABE in PENDING state.')
      }

      return {
        kuspitAccountId: accountId,
        accessToken: tokenResponse.access_token,
      }
    })
  },

  /**
   * Attempts to renew the access_token using the saved refresh_token.
   * @param kuspitAccountId - Kuspit account ID
   */
  async refreshSession(kuspitAccountId: number) {
    // 1. We check for settings from the Kuspit id.
    if (!kuspitAccountId) {
      throw new AppError(404, 'There is no linked Kuspit account to refresh.')
    }

    const settings = await prisma.accountSetting.findFirst({
      where: { idAccount: kuspitAccountId },
    })

    if (!settings?.kuspitRefreshToken) {
      throw new AppError(401, 'No refresh token found')
    }

    const client_id = process.env['KUSPIT_CLIENT_ID']
    const client_secret = process.env['KISPIT_CLIENT_SECRET']
    const redirect_uri = process.env['KUSPIT_REDIRECT_URI']

    if (
      typeof client_id !== 'string'
      || typeof client_secret !== 'string'
      || typeof redirect_uri !== 'string'
    ) {
      throw new AppError(500, 'Missing or invalid Kuspit environment variables')
    }

    const tokenParams: TokenRefreshParams = {
      grant_type: 'refresh_token',
      client_id: client_id,
      client_secret: client_secret,
      redirect_uri: redirect_uri,
      refresh_token: settings.kuspitRefreshToken,
    }

    try {
      // 3. We call Kuspit API to renew
      logger.info({ kuspitAccountId }, '🔄 Renewing Kuspit token...')
      const tokenResponse = await adapter.refreshToken(tokenParams)

      // 4. We save the NEW tokens in the DB.
      await prisma.accountSetting.updateMany({
        where: { idAccount: kuspitAccountId },
        data: {
          kuspitAccessToken: tokenResponse.access_token,
          kuspitTokenExpiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)),
        },
      })

      logger.info({ kuspitAccountId }, '✅ Token successfully renewed')

      return {
        accessToken: tokenResponse.access_token,
        kuspitAccountId: kuspitAccountId,
      }
    }
    catch (error) {
      // If the refresh fails (token revoked or too old),
      // we clear the tokens to force a new login next time.
      await prisma.accountSetting.updateMany({
        where: { idAccount: kuspitAccountId },
        data: { kuspitAccessToken: null, kuspitRefreshToken: null },
      })

      logger.error({ error, kuspitAccountId }, 'Failed to renew Kuspit token, forcing re-link.')

      throw new AppError(401, 'The session could not be renewed. Please accept the terms again.')
    }
  },
}
