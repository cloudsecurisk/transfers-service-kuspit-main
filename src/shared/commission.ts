import { Prisma, type bankingSourceRate } from '../generated/prisma/client.ts'
import { prisma } from '../shared/prisma.ts'

// --- Configuration ---
const IVA_RATE = 0.16
const IVA_MULTIPLIER = 1 + IVA_RATE

// --- Interfaces ---

interface FeeStructure {
  public: { fixed: number, percentage: number }
  real: { fixed: number, percentage: number }
}

interface CommissionResult {
  commission: number
  realCommission: number
  utility: number
  deposit: number
}

// --- Core Logic (Standarized) ---

/**
 * Standardizes the plan data from Prisma into a FeeStructure.
 */
function normalizePlan(rate: Partial<bankingSourceRate>): FeeStructure {
  // Helper to convert Decimal from Prisma to Number of TS
  const parse = (val: unknown) => Number(val) || 0

  // 1. Search if it has legacy percentage mode
  const isLegacyPercentageMode = rate.porcentage === 1

  let publicFixed
  let publicPercent

  const rawPublicValue = parse(rate.speiComission) + parse(rate.espiralComission)

  if (isLegacyPercentageMode) {
    publicFixed = 0
    publicPercent = rawPublicValue
  }
  else {
    publicFixed = rawPublicValue
    publicPercent = parse(rate.espiralComissionPercentage)
  }

  // Real Costs
  const rawRealValue = parse(rate.realSpeiComission) + parse(rate.realEspiralComission)

  return {
    public: {
      fixed: publicFixed,
      percentage: publicPercent,
    },
    real: {
      fixed: rawRealValue,
      percentage: parse(rate.realEspiralComissionPercentage),
    },
  }
}

/**
 * Calculation Function
 */
function calculateFees(amount: number, fees: FeeStructure): CommissionResult {
  const amountNum = Number(amount)

  // 1. Calculate Public Commission (What the user pays)
  const publicBase = fees.public.fixed + (amountNum * (fees.public.percentage / 100))
  const commission = publicBase * IVA_MULTIPLIER

  // 2. Calculate Real Commission (Your Cost)
  const realBase = fees.real.fixed + (amountNum * (fees.real.percentage / 100))
  const realCommission = realBase * IVA_MULTIPLIER

  // 3. Results
  const utility = commission - realCommission
  const deposit = amountNum - commission

  return {
    commission,
    realCommission,
    utility,
    deposit: deposit < 0 ? 0 : deposit,
  }
}

// --- Data Layer (Prisma) ---

export async function getPlan(
  idClabe: number,
  addTransactions: number,
  initDay = 1,
  idCommerce: number | null = null,
) {
  // 1. Dates Logic
  const now = new Date()
  const targetMonth = now.getDate() < initDay ? now.getMonth() - 1 : now.getMonth()
  const startDate = new Date(now.getFullYear(), targetMonth, initDay, 0, 0, 0)
  const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1))
  endDate.setSeconds(endDate.getSeconds() - 1)

  // 2. Count Logic
  let movementsCount
  const dateFilter = { createdAt: { gte: startDate, lte: endDate } }

  if (idCommerce) {
    movementsCount = await prisma.movement.count({
      where: {
        ...dateFilter,
        OR: [
          { senderClabe: { stpAccountClabe: { some: { account: { idCommerce } } } } },
          { receiverClabe: { stpAccountClabe: { some: { account: { idCommerce } } } } },
        ],
      },
    })
  }
  else {
    movementsCount = await prisma.movement.count({
      where: {
        ...dateFilter,
        OR: [{ idSenderClabe: idClabe }, { idReceiverClabe: idClabe }],
      },
    })
  }

  const totalTransactions = movementsCount + addTransactions

  // 3. Rate Search
  const rate = await prisma.bankingSourceRate.findFirst({
    where: {
      minTransactionCost: { lte: totalTransactions },
      maxTransactionCost: { gte: totalTransactions },
    },
  })

  return rate
}

// --- Principal Public Function ---

/**
 * Receive the amount and raw result of getPlan (bankingSourceRate)
 */
export async function calculateCommission(amount: number, rate: Partial<bankingSourceRate> | null): Promise<CommissionResult> {
  // 1. Fallback / Default Values
  if (!rate) {
    rate = {
      porcentage: 0,
      speiComission: Prisma.Decimal(0),
      espiralComission: Prisma.Decimal(12.00),
      espiralComissionPercentage: Prisma.Decimal(0),
      realSpeiComission: Prisma.Decimal(0),
      realEspiralComission: Prisma.Decimal(0),
      realEspiralComissionPercentage: Prisma.Decimal(0),
    }
  }

  // 2. Normalization
  const fees = normalizePlan(rate)

  // 3. Calculate
  return calculateFees(amount, fees)
}
