import { Router } from 'express'
// import { requirePermission } from '../middlewares/auth.middleware.ts'
import { KuspitCatalogController } from '../controllers/catalog.controller.ts'
import { AccountController } from '../controllers/account.controller.ts'
import { openMoralAccountSchema, openPhysicalAccountSchema } from '../schemas/account.schema.ts'
import { validateBody, validateParams } from '../middlewares/validation.middleware.ts'
import { BankController } from '../controllers/bank.controller.ts'
import { getStatusSchema, makeTransferSchema, makeWithdrawalSchema, registerProviderSchema, updateBankInfoSchema } from '../schemas/bank.schema.ts'
import { completeRecordSchema } from '../schemas/document.schema.ts'
import { transactionalRecordSchema } from '../schemas/transactional.schema.ts'
import { DocumentController } from '../controllers/document.controller.ts'
import { uploadMiddleware } from '../middlewares/upload.middleware.ts'

const router = Router()

// -- ACCOUNT ROUTES --

/**
 * POST /api/accounts/open-physical
 */
router.post(
  '/open-physical',

  // 1. Permission Middleware
  // 'route' debe ser el string que tengas registrado en tu tabla de permisos en Beluga/Legacy
  // requirePermission({
  //   route: 'kuspit/openAccount', // <--- IMPORTANTE: Definir este nombre en tu DB Legacy
  //   module: 'transfer',
  //   passUser: true
  // }),

  // 2. Body Validation Middleware
  validateBody(openPhysicalAccountSchema),

  // 3. Controller
  AccountController.openPhysical,
)

/**
 * POST /api/open-moral
 */
router.post(
  '/open-moral',

  // 1. Auth & Permission Middleware
  // requirePermission({
  //   route: 'kuspit/openAccountMoral',
  //   passUser: true
  // }),

  // 2. Body Validarion (Schema Moral)
  validateBody(openMoralAccountSchema),

  // 3. Controller
  AccountController.openMoral,
)

/**
 * GET /api/:idAccount/status
 * Check the status of a contract on Kuspit
 */
router.get(
  '/:idAccount/status',

  // 1. Auth Legacy
  // requirePermission({
  //   route: 'kuspit/consultarEstatus', // Define este permiso en tu Legacy
  //   passUser: true
  // }),

  // 2. Controller
  AccountController.getStatus,
)

/**
 * POST /api/:idAccount/transactional-record
 * Submit the transactional record for an account.
 */
router.post(
  '/:idAccount/transactional-record',

  // 1. Auth Legacy
  // requirePermission({
  //   route: 'kuspit/enviarHistorial', // Define this permission in Legacy
  //   passUser: true
  // }),

  // 2. Body Validation Middleware
  validateBody(transactionalRecordSchema),

  // 3. Controller
  AccountController.transactionalRecord,
)

// -- BANKING ROUTES --

/**
 * GET /api/:idAccount/position
 */
router.get(
  '/:idAccount/position',

  // 1. Auth Legacy
  // requirePermission({
  //   route: 'kuspit/consultarPortafolio', // Define este permiso en Legacy
  //   passUser: true
  // }),

  // 2. Controller
  BankController.getPosition,
)

/**
 * GET /api/:idAccount/liquid-assets
 * Get the liquid assets for an account.
 */
router.get(
  '/:idAccount/liquid-assets',

  // 1. Auth Legacy
  // requirePermission({
  //   route: 'kuspit/consultarActivosLiquidos', // Define this permission in Legacy
  //   passUser: true
  // }),

  // 2. Controller
  BankController.getLiquidAssets,
)

/**
 * POST /api/:idAccount/provider
 * Register/Cancel/Change providers
 */
router.post(
  '/:idAccount/providers',

  // 1. Auth Legacy
  // requirePermission({ route: 'kuspit/adminProviders', passUser: true }),

  // 2. Zod Validation Middleware
  validateBody(registerProviderSchema),

  // 3. Controller
  BankController.registerProvider,
)

/**
 * POST /api/transfer/:idAccount
 * Make an outgoing transfer
 */
router.post(
  '/transfer/:idAccount',

  // 1. Authorization (Legacy Permissions)
  // requirePermission({
  //   route: 'kuspit/realizarTransferencia', // Ajusta el nombre de tu permiso legacy
  //   passUser: true
  // }),

  // 2. Validation (Zod Schema)
  validateBody(makeTransferSchema),

  // 3. Controller Logic
  BankController.makeTransfer,
)

/**
 * GET /transactions/:transactionId/status
 * Check the status in real time and reconcile if necessary.
 */
router.get(
  '/transactions/:transactionId/status',

  // 1. Authorization Middleware
  // requirePermission({ route: 'kuspit/consultarStatus', passUser: true }),

  // 2. Validation Middleware
  validateParams(getStatusSchema),

  // 3. Controller Logic
  BankController.getStatus,
)

// router.get(
//   '/:idAccount/movements',
//   // requirePermission({ route: 'kuspit/consultarMovimientos', passUser: true }),

//   // 2. Validation Middleware
//   validateQuery(getMovementsSchema),

//   // 3. Controller Logic
//   BankController.getMovements,
// )

router.post(
  '/:idAccount/withdraw',
  // requirePermission({ route: 'kuspit/realizarRetiro', passUser: true }),

  // 2. Validation Middleware
  validateBody(makeWithdrawalSchema),

  // 3. Controller Logic
  BankController.makeWithdrawal,
)

// POST /api/:idAccount/info
router.post(
  '/:idAccount/info',
  // requirePermission({ route: 'kuspit/actualizarBancos', passUser: true }),

  // 1. Multer Middleware
  uploadMiddleware.single('caratulaCuentaClaBe'),

  // 2. Zod valida idBanco, clabe, idTipoAccion
  validateBody(updateBankInfoSchema),

  BankController.updateBankInfo,
)

// -- DOCUMENTS ROUTES --

/*
 * POST /api/:idAccount/documents
 */
router.post(
  '/:idAccount/documents',
  // requirePermission({ route: 'kuspit/subirDocumento', passUser: true }),

  // 1. Multer processes Multipart (Extracts file and body)
  uploadMiddleware.single('archivo'), // 'archivo' is the name in the Form Data from the Frontend

  // 2. Validation Middleware
  validateBody(completeRecordSchema),

  // 3. Execute logic
  DocumentController.upload,
)

// -- CATALOG ROUTES --
router.get(
  '/catalogs/fiscal-regimes',
  // requirePermission(),
  KuspitCatalogController.getRegimes,
)

router.get(
  '/catalogs/banks',
  // requirePermission(),
  KuspitCatalogController.getBanks,
)

router.get(
  '/catalogs/giros',
  // verifyToken,
  KuspitCatalogController.getGiros)

router.get(
  '/catalogs/activities',
  // verifyToken,
  KuspitCatalogController.getActivities)

router.get(
  '/catalogs/documents',
  // verigyToken
  BankController.getDocumentCatalogs,
)

router.get(
  '/catalogs/incomes',
  // requirePermission(),
  KuspitCatalogController.getIncomes,
)

router.get(
  '/catalogs/provenances',
  // requirePermission(),
  KuspitCatalogController.getProvenances,
)

router.get(
  '/catalogs/sources',
  // requirePermission(),
  KuspitCatalogController.getSources,
)

router.get(
  '/catalogs/operations',
  // requirePermission(),
  KuspitCatalogController.getOperations,
)

router.get(
  '/catalogs/investments',
  // requirePermission(),
  KuspitCatalogController.getInvestments,
)

router.get(
  '/catalogs/markets',
  // requirePermission(),
  KuspitCatalogController.getMarkets,
)

export default router
