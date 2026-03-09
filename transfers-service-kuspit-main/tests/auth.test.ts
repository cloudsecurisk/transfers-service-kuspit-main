import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { logger } from '../src/shared/logger.ts'
import { AppError } from '../src/shared/error-handler.ts'
import { KuspitBankAdapter } from '../src/adapter/kuspit-bank-adapter.ts'

// Mock logger methods
logger.info = () => {
  /* mock info */
}
logger.warn = () => {
  /* mock warn */
}
logger.error = () => {
  /* mock error */
}

describe('KuspitBankAdapter', () => {
  let adapter: KuspitBankAdapter

  beforeEach(() => {
    adapter = new KuspitBankAdapter()
  })

  describe('linkClient', () => {
    it('should successfully link client and return response', async () => {
      const params = {
        idt: Number(process.env['KUSPIT_IDT']) || 123,
        scope: process.env['KUSPIT_SCOPE'] || 'read:write',
        redirect_uri: process.env['KUSPIT_REDIRECT_URI'] || 'https://example.com/callback',
        client_id: process.env['KUSPIT_CLIENT_ID'] || 'client123',
        state: 1234567890,
        passwordLogin: 'pass',
        correoLogin: 'email@example.com',
        idExterno: 'ext123',
        aceptaCond: 1 as 0 | 1,
      }

      global.fetch = async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            code: 'dummy_code_123',
            state: '1234567890',
            idExterno: 'ext123',
          }),
        } as Response)

      const result = await adapter.linkClient(params)
      console.log(result)
      assert.deepEqual(result, {
        code: 'dummy_code_123',
        state: '1234567890',
        idExterno: 'ext123',
      })
    })

    it('should throw AppError on failed response', async () => {
      global.fetch = async () =>
        Promise.resolve({
          ok: false,
          status: 403,
          text: async () => 'Forbidden',
        } as Response)

      await assert.rejects(
        () =>
          adapter.linkClient({
            idt: 123,
            scope: 'read:write',
            redirect_uri: 'https://example.com/callback',
            client_id: 'client123',
            state: 1234567890,
            passwordLogin: 'pass',
            correoLogin: 'email@example.com',
            idExterno: 'ext123',
            aceptaCond: 1,
          }),
        AppError,
      )
    })

    it('should throw validation error for invalid state', async () => {
      await assert.rejects(
        () =>
          adapter.linkClient({
            idt: 123,
            scope: 'read:write',
            redirect_uri: 'https://example.com/callback',
            client_id: 'client123',
            state: 123,
            passwordLogin: 'pass',
            correoLogin: 'email@example.com',
            idExterno: 'ext123',
            aceptaCond: 1,
          }),
        AppError,
      )
    })
  })

  describe('requestToken', () => {
    it('should successfully request token and return response', async () => {
      global.fetch = async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            clabeBanco: 'dummy_clabeBanco',
            usuario: 'dummy_user',
            idBanco: 1111,
            expires_in: 3600,
            refresh_token: 'dummy_refresh',
            access_token: 'dummy_access',
            clabeKuspit: 'dummy_clabeKuspit',
            contrato: 'dummy_contract',
          }),
        } as Response)

      const result = await adapter.requestToken({
        grant_type: 'authorization_code',
        client_id: 'client123',
        client_secret: 'secret123',
        redirect_uri: 'https://example.com/callback',
        code: 'authcode123',
      })

      assert.deepEqual(result, {
        clabeBanco: 'dummy_clabeBanco',
        usuario: 'dummy_user',
        idBanco: 1111,
        expires_in: 3600,
        refresh_token: 'dummy_refresh',
        access_token: 'dummy_access',
        clabeKuspit: 'dummy_clabeKuspit',
        contrato: 'dummy_contract',
      })
    })

    it('should throw AppError on failed response', async () => {
      global.fetch = async () =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        } as Response)

      await assert.rejects(
        () =>
          adapter.requestToken({
            grant_type: 'authorization_code',
            client_id: 'client123',
            client_secret: 'secret123',
            redirect_uri: 'https://example.com/callback',
            code: 'authcode123',
          }),
        AppError,
      )
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token and return response', async () => {
      global.fetch = async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            expires_in: 3600,
            access_token: 'new_dummy_access',
          }),
        } as Response)

      const result = await adapter.refreshToken({
        grant_type: 'refresh_token',
        client_id: 'client123',
        client_secret: 'secret123',
        refresh_token: 'refresh123',
      })

      assert.deepEqual(result, {
        expires_in: 3600,
        access_token: 'new_dummy_access',
      })
    })

    it('should throw AppError on failed response', async () => {
      global.fetch = async () =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as Response)

      await assert.rejects(
        () =>
          adapter.refreshToken({
            grant_type: 'refresh_token',
            client_id: 'client123',
            client_secret: 'secret123',
            refresh_token: 'refresh123',
          }),
        AppError,
      )
    })
  })
})
