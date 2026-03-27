import { adapter } from '../adapter/kuspit.adapter.ts'
import type { CatalogParams, CatalogResponse } from '../adapter/kuspit/utils.ts'

// 1. Interface and data
interface SatRegimeItem {
  id: string
  descripcion: string
  aplicaPersonaFisica: boolean
  aplicaPersonaMoral: boolean
}

// Source Catalog (Single Source of Truth)
const SAT_REGIMES: SatRegimeItem[] = [
  { id: '601', descripcion: 'General de Ley Personas Morales', aplicaPersonaFisica: false, aplicaPersonaMoral: true },
  { id: '603', descripcion: 'Personas Morales con Fines no Lucrativos', aplicaPersonaFisica: false, aplicaPersonaMoral: true },
  { id: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '606', descripcion: 'Arrendamiento', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '608', descripcion: 'Demás ingresos', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México', aplicaPersonaFisica: true, aplicaPersonaMoral: true },
  { id: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '614', descripcion: 'Ingresos por intereses', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '615', descripcion: 'Régimen de los ingresos por obtención de premios', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '616', descripcion: 'Sin obligaciones fiscales', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', aplicaPersonaFisica: false, aplicaPersonaMoral: true },
  { id: '621', descripcion: 'Incorporación Fiscal', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', aplicaPersonaFisica: true, aplicaPersonaMoral: true },
  { id: '623', descripcion: 'Opcional para Grupos de Sociedades', aplicaPersonaFisica: false, aplicaPersonaMoral: true },
  { id: '624', descripcion: 'Coordinados', aplicaPersonaFisica: false, aplicaPersonaMoral: true },
  { id: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', aplicaPersonaFisica: true, aplicaPersonaMoral: false },
  { id: '626', descripcion: 'Régimen Simplificado de Confianza (RESICO)', aplicaPersonaFisica: true, aplicaPersonaMoral: true },
]

export const KuspitCatalogService = {

  /**
   * Gets the list of Fiscal Regimes (for physical or moral persons)
   */
  async getFiscalRegimes(type: 'fisica' | 'moral') {
    // 2. Simplified filtering
    const isPhysical = type === 'fisica'

    const filtered = SAT_REGIMES.filter(r =>
      isPhysical ? r.aplicaPersonaFisica : r.aplicaPersonaMoral,
    )

    // 3. Frontend-friendly mapping
    return filtered.map(item => ({
      value: item.id,
      label: `${item.id} - ${item.descripcion}`,
    }))
  },

  /**
   * Gets the list of Banks from Kuspit Catalog
   */
  async getBanks() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'bancos' })

    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  /**
   * Gets the list of Business Lines (Economic sectors)
   */
  async getGiros() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'giros' })

    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  /**
   * Gets the list of Activities.
   * SHOULD receive an idGiro to filter.
   */
  async getActivities(idGiro?: string) {
    // Kuspit asks for a query param
    const params: CatalogParams = { name: 'actividades' }
    if (idGiro) params.idGiro = idGiro

    const rawData = await adapter.getCatalog<CatalogResponse[]>(params)

    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getIncomes() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'ingresos' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getProvenances() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'procedencia' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getSources() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'fuentes' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getOperations() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'operaciones' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getInvestments() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'inversiones' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },

  async getMarkets() {
    const rawData = await adapter.getCatalog<CatalogResponse[]>({ name: 'mercados' })
    return rawData.map(item => ({
      value: item.id.toString(),
      label: item.descripcion,
    }))
  },
}
