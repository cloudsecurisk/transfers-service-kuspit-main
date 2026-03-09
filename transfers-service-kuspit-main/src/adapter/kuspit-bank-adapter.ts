import { linkClient, refreshToken, requestToken } from './kuspit/auth.ts'
import { openPhysicalAccount, openMoralAccount, getAccountOpeningStatus, completeRecord } from './kuspit/account.ts'
import { registerProvider, makeTransfer, getTransferStatus, getAccountMovements, makeWithdrawal, updateBankInfo, getPosition } from './kuspit/bank.ts'

export class KuspitBankAdapter {
  linkClient = linkClient
  requestToken = requestToken
  refreshToken = refreshToken
  openPhysicalAccount = openPhysicalAccount
  openMoralAccount = openMoralAccount
  getAccountOpeningStauts = getAccountOpeningStatus
  completeRecord = completeRecord
  registerProvider = registerProvider
  makeTransfer = makeTransfer
  getTransferStatus = getTransferStatus
  getAccountMovements = getAccountMovements
  makeWithdrawal = makeWithdrawal
  updateBankInfo = updateBankInfo
  getPosition = getPosition
}
