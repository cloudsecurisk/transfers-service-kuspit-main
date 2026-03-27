export interface CommerceCountry {
  id: number
  name: string
  aspCode: number
  aspCodeNationality: number
}

export interface CommerceState {
  id: number
  name: string
  iso: string
  aspCode: number
}

export interface CommerceCity {
  id: number
  name: string
}

export interface CommerceAddress {
  street: string
  zipCode: string
  exteriorNumber: string
  interiorNumber: string | null
  suburb: string
  countries: CommerceCountry
  states: CommerceState
  cities: CommerceCity
}

export interface CommerceOfficialDocument {
  id: number
  name: string
  description: string | null
  institutionName: string
  aspCode: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Occupation {
  id: number
  code: number
  name: string
}

export interface CommerceLegalRepresentative {
  id: number
  idCommerce: number
  idMaritalStatus: number
  idAddress: number
  gender: string | null // "M" | "F" ?
  isValidated: number
  name: string
  lastName: string
  motherLastName: string
  birthday: string
  RFC: string
  CURP: string
  oficialDocumentNumber: string
  validity: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  idOfificialDocument: number
  address: CommerceAddress
  officialDocument: CommerceOfficialDocument
  occupation: Occupation
  electronicSignatureSerialNumber: string
  idOccupation: number
}

export interface CommerceOrganization {
  idRoleMpos: number
  idRoleTransfer: number
}

export interface CommerceType {
  id: number
  name: string
}

export interface CommerceFinancialInformation {
  id: number
  month1: string
  month2: string
  month3: string
  totalCash: string
  totalPos: string
  totalEcommerce: string
  averagePerMonth: string
  averagePerTransaction: string
}

export interface CommerceLineBusiness {
  id: number
  name: string
  lineBussinessBanorte: number
}

export interface CommerceLineBusinessASP {
  id: number
  code: number
  name: string
}

export interface CommerceInfo {
  id: number
  legalRepresentative: CommerceLegalRepresentative[]
  organization: CommerceOrganization[]
  commerceType: CommerceType
  commerceDocument: []
  financialInformation: CommerceFinancialInformation[]
  lineBusiness: CommerceLineBusiness
  lineBusinessASP: CommerceLineBusinessASP
}

// 📦 Principal Interface
export interface GeneralInfoCommerce {
  email: string
  phone: string
  commerceName: string
  rfc: string
  socialReason: string
  webpage: string
  actNumber: string | null
  contract: string | null
  registrationDate: string | null
  notaryCity: string | null
  notaryNumber: string | null
  nameOfTheNotary: string | null
  numeroCatastro: string | null
  electronicSignatureSerialNumber: string
  latitude: string | null
  longitude: string | null
  city: string | null
  address: CommerceAddress
  commerce: CommerceInfo
}
