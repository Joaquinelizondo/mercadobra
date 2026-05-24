import React, { useState, useEffect, useRef } from "react";
import { useSpeechInput } from '../hooks/useSpeechInput';
import "../styles/GroupQuote.css";
import { createLead } from "../lib/api";

export default function GroupQuoteWidget() {
  const [input, setInput] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const inputRef = useRef(null);
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
        inputRef.current?.focus();
      }
    },
    lang: 'es-AR',
  });

  useEffect(() => {
    setVoiceError(speechError || "");
  }, [speechError]);

  const handleAddProduct = (e) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (products.includes(value)) return;
    setProducts([...products, value]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleRemoveProduct = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    if (input.trim()) {
      handleAddProduct(e);
      setLoading(false);
      return;
    }
    if (products.length === 0) {
      setError("Agregá al menos un producto a cotizar.");
      setLoading(false);
      return;
    }
    try {
      await createLead({
        name: "Cotizador grupal",
        email: "voz@mercadobra.com",
        phone: "-",
        message: products.join(", "),
        plan: "pro",
        source: "group-quote-widget-lista",
        products: products.map((name) => ({ name })),
      });
      setSuccess(true);
      setProducts([]);
      setInput("");
    } catch (err) {
      setError("Ocurrió un error al enviar la cotización. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-quote-widget classic gq-list-mode">
      <h2 className="gq-title">Tu obra arranca acá</h2>
      <form className="gq-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="gq-input-row">
          <input
            ref={inputRef}
            className="gq-input main"
            type="text"
            placeholder="¿Qué necesitás para tu obra? (ej: cemento portland, arena, hierro...)"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading || isVoiceListening}
            maxLength={80}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (input.trim()) handleAddProduct(e);
              }
            }}
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
          <button
            type="button"
            className="gq-add-btn"
            onClick={handleAddProduct}
            disabled={loading || !input.trim()}
            aria-label="Agregar producto"
          >
            +
          </button>
        </div>
        {products.length > 0 && (
          <div className="gq-products-listbox">
            <ul className="gq-products-list">
              {products.map((prod, idx) => (
                <li key={prod + idx} className="gq-product-item">
                  <span className="gq-product-name">{prod}</span>
                  <button
                    type="button"
                    className="gq-remove-btn"
                    onClick={() => handleRemoveProduct(idx)}
                    aria-label={`Eliminar ${prod}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
