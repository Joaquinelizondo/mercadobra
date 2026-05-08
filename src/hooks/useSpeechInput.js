import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function mapRecognitionError(errorCode) {
  const errors = {
    'not-allowed': 'No hay permiso para usar el micrófono.',
    'audio-capture': 'No se detectó micrófono disponible.',
    'network': 'Hubo un problema de red al procesar la voz.',
    'no-speech': 'No se detectó voz. Intentá nuevamente.',
    'aborted': 'La captura de voz fue cancelada.',
  }

  return errors[errorCode] || 'No se pudo procesar la captura de voz.'
}

export function useSpeechInput({ lang = 'es-AR', onResult } = {}) {
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')

  const isSupported = Boolean(getSpeechRecognitionConstructor())

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      setError('Tu navegador no soporta búsqueda por voz.')
      return false
    }

    setError('')

    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    const recognition = new Recognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim()
      if (transcript && onResultRef.current) {
        onResultRef.current(transcript)
      }
    }

    recognition.onerror = (event) => {
      setError(mapRecognitionError(event.error))
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    return true
  }, [lang])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    clearError: () => setError(''),
  }
}
