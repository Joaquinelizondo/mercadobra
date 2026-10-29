import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  REGIONAL_PROFILES,
  getRegionalProfile,
  formatRegionalMoney
} from './constructionRegionalProfiles.js'

test('Multi-país: getRegionalProfile retorna perfil de Uruguay con SUNCA y 60% BPS', () => {
  const uy = getRegionalProfile('UY')
  assert.equal(uy.countryName, 'Uruguay')
  assert.equal(uy.currency, 'UYU')
  assert.equal(uy.defaultSocialLawsRate, 60)
  assert.match(uy.laborAgreement, /SUNCA/)
  assert.equal(uy.categories.length, 6)
})

test('Multi-país: getRegionalProfile retorna perfil de Argentina con UOCRA y 65% cargas sociales', () => {
  const ar = getRegionalProfile('AR')
  assert.equal(ar.countryName, 'Argentina')
  assert.equal(ar.currency, 'ARS')
  assert.equal(ar.defaultSocialLawsRate, 65)
  assert.match(ar.laborAgreement, /UOCRA/)
  assert.equal(ar.categories.length, 5)
})

test('Multi-país: getRegionalProfile retorna perfil de Chile con CChC y 35% previsional', () => {
  const cl = getRegionalProfile('CL')
  assert.equal(cl.countryName, 'Chile')
  assert.equal(cl.currency, 'CLP')
  assert.equal(cl.defaultSocialLawsRate, 35)
  assert.match(cl.laborAgreement, /CChC/)
})

test('Multi-país: getRegionalProfile fallback a UY para códigos desconocidos', () => {
  const fallback = getRegionalProfile('ZZ')
  assert.equal(fallback.code, 'UY')
})

test('Multi-país: formatRegionalMoney formatea adecuadamente según país', () => {
  const uyu = formatRegionalMoney(150000, 'UY')
  assert.match(uyu, /150/)

  const usd = formatRegionalMoney(12000, 'INT')
  assert.match(usd, /\$12,000/)
})

