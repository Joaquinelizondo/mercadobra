import React, { useState, useEffect } from "react";
import { useSpeechInput } from '../hooks/useSpeechInput';
import "../styles/GroupQuote.css";
import { createLead } from "../lib/api";

export default function GroupQuoteWidget() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening,
    error: speechError,
    startListening,
    stopListening,
    clearError: clearVoiceError,
  } = useSpeechInput({
    onResult: (transcript) => {
      if (transcript && transcript.trim()) {
        setInput(transcript.trim());
      }
    },
    lang: 'es-AR',
  });

  useEffect(() => {
    setVoiceError(speechError || "");
  }, [speechError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      if (!input.trim()) {
        setError("Contanos qué necesitás para tu obra.");
        setLoading(false);
        return;
      }
      await createLead({
        name: "Cotizador por voz",
        email: "voz@mercadobra.com",
        phone: "-",
        message: input.trim(),
        plan: "cotizador-voz",
        source: "group-quote-widget-voz",
        products: [{ name: input.trim() }],
      });
      setSuccess(true);
      setInput("");
    } catch (err) {
      setError("Ocurrió un error al enviar la cotización. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-quote-widget classic">
      <h2 className="gq-title">Tu obra arranca acá</h2>
      <form className="gq-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="gq-input-row">
          <input
            className="gq-input main"
            type="text"
            placeholder="¿Qué necesitás para tu obra? (podés dictar por voz)"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading || isVoiceListening}
            maxLength={120}
            autoFocus
          />
          {isVoiceSupported && (
            <button
              type="button"
              className={`gq-mic-btn${isVoiceListening ? ' gq-mic-active' : ''}`}
              title={isVoiceListening ? 'Detener dictado' : 'Dictar por voz'}
              onClick={() => {
                if (isVoiceListening) {
                  stopListening();
                } else {
                  clearVoiceError();
                  startListening();
                }
              }}
              disabled={loading}
              aria-label="Dictar por voz"
            >
              <span role="img" aria-label="micrófono">{isVoiceListening ? '🎤' : '🎙️'}</span>
            </button>
          )}
        </div>
        {voiceError && <div className="gq-error">{voiceError}</div>}
        {error && <div className="gq-error">{error}</div>}
        {success && <div className="gq-success">¡Cotización enviada! Te contactaremos pronto.</div>}
        <button className="gq-submit-btn" type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Arrancar mi obra"}
        </button>
      </form>
    </div>
  );
}
