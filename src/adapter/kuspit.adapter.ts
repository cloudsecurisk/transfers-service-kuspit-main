import { linkClient, refreshToken, requestToken } from './kuspit/auth.ts'
import { openPhysicalAccount, openMoralAccount, getAccountOpeningStatus, completeRecord, transactionalRecord } from './kuspit/account.ts'
import { registerProvider, makeTransfer, getTransferStatus, getAccountMovements, makeWithdrawal, updateBankInfo, getPosition, getLiquidAssets } from './kuspit/bank.ts'
import { getCatalog } from './kuspit/utils.ts'

export const adapter = {
  // Auth
  linkClient,
  requestToken,
  refreshToken,

  // Account
  openPhysicalAccount,
  openMoralAccount,
  getAccountOpeningStatus,
  completeRecord,
  transactionalRecord,

  // Bank
  registerProvider,
  makeTransfer,
  getTransferStatus,
  getAccountMovements,
  makeWithdrawal,
  updateBankInfo,
  getPosition,
  getLiquidAssets,

  // Utils
  getCatalog,
}
