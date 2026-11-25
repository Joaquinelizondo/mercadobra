import test from 'node:test'
import assert from 'node:assert/strict'
import { getAttachmentDownloadUrl } from './attachments.js'

test('getAttachmentDownloadUrl agrega fl_attachment a URLs de Cloudinary sin transformación', () => {
  const original = 'https://res.cloudinary.com/yacmhnky/image/upload/v1795563032/mercadobra/products/attachments/Oxida_Studio_Presupuesto_Franzini_3_Techos_pdf.pdf'
  const expected = 'https://res.cloudinary.com/yacmhnky/image/upload/fl_attachment/v1795563032/mercadobra/products/attachments/Oxida_Studio_Presupuesto_Franzini_3_Techos_pdf.pdf'
  assert.equal(getAttachmentDownloadUrl(original), expected)
})

test('getAttachmentDownloadUrl no duplica fl_attachment si ya está presente', () => {
  const original = 'https://res.cloudinary.com/yacmhnky/image/upload/fl_attachment/v1795563032/mercadobra/products/attachments/doc.pdf'
  assert.equal(getAttachmentDownloadUrl(original), original)
})

test('getAttachmentDownloadUrl preserva data URLs base64 y blob URLs', () => {
  const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQK...'
  assert.equal(getAttachmentDownloadUrl(dataUrl), dataUrl)

  const blobUrl = 'blob:http://localhost:5173/d3a8-44fb'
  assert.equal(getAttachmentDownloadUrl(blobUrl), blobUrl)
})

test('getAttachmentDownloadUrl retorna URLs normales de otros dominios sin mutar', () => {
  const external = 'https://example.com/files/plano_estructural.pdf'
  assert.equal(getAttachmentDownloadUrl(external), external)
})

test('getAttachmentDownloadUrl maneja entradas vacías o inválidas', () => {
  assert.equal(getAttachmentDownloadUrl(''), '')
  assert.equal(getAttachmentDownloadUrl(null), '')
  assert.equal(getAttachmentDownloadUrl(undefined), '')
  assert.equal(getAttachmentDownloadUrl('   '), '')
})
