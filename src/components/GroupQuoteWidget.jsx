
import React, { useState, useEffect, useRef } from "react";
import { useSpeechInput } from '../hooks/useSpeechInput';
import "../styles/GroupQuote.css";
import { createLead } from "../lib/api";


export default function GroupQuoteWidget({ onSuccess }) {
  const [step, setStep] = useState(1); // 1: productos, 2: datos cliente, 3: éxito
  const [input, setInput] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [client, setClient] = useState({ name: "", email: "", phone: "" });
  const [clientError, setClientError] = useState("");
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


  // Paso 1: productos
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError("");
    if (input.trim()) {
      handleAddProduct(e);
      return;
    }
    if (products.length === 0) {
      setError("Agregá al menos un producto a cotizar.");
      return;
    }
    setStep(2);
  };

  // Paso 2: datos cliente y envío
  const handleClientChange = (e) => {
    setClientError("");
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setClientError("");
    setLoading(true);
    // Validación simple
    if (!client.name.trim() || !client.email.trim() || !client.phone.trim()) {
      setClientError("Completá todos los datos para cotizar.");
      setLoading(false);
      return;
    }
    // Validación de email básica
    if (!/^\S+@\S+\.\S+$/.test(client.email)) {
      setClientError("Ingresá un email válido.");
      setLoading(false);
      return;
    }
    try {
      await createLead({
        name: client.name,
        company: "Cotizador Web",
        email: client.email,
        phone: client.phone,
        message: products.join(", "),
        plan: "pro",
        source: "group-quote-widget-lista",
        products: products.map((name) => ({ name })),
      });
      setSuccess(true);
      setStep(3);
      if (onSuccess) onSuccess(products);
      setProducts([]);
      setInput("");
      setClient({ name: "", email: "", phone: "" });
    } catch (err) {
      setClientError("Ocurrió un error al enviar la cotización. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-quote-widget classic gq-list-mode">
      <h2 className="gq-title">Tu obra arranca acá</h2>
      {step === 1 && (
        <form className="gq-form" onSubmit={handleStep1Submit} autoComplete="off">
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
          <button className="gq-submit-btn" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Arrancar mi obra"}
          </button>
        </form>
      )}
      {step === 2 && (
        <form className="gq-form" onSubmit={handleStep2Submit} autoComplete="off" style={{marginTop: 8}}>
          <div className="gq-products-listbox" style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '1.08em', color: '#fb923c' }}>Productos a cotizar:</div>
            <ul className="gq-products-list">
              {products.map((prod, idx) => (
                <li key={prod + idx} className="gq-product-item" style={{border: 'none', background: '#fff7ed', borderRadius: 8, marginBottom: 6, padding: '0.7rem 1rem'}}>
                  <span className="gq-product-name" style={{color: '#b45309', fontWeight: 700}}>{prod}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="gq-client-form" style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <label className="gq-label" style={{fontWeight: 600, color: '#22223b', marginBottom: 2}}>
              Nombre y apellido
              <input
                className="gq-input"
                name="name"
                value={client.name}
                onChange={handleClientChange}
                disabled={loading}
                required
                placeholder="Ej: Juan Pérez"
                style={{marginTop: 6, fontSize: '1.09em', borderRadius: 12, border: '1.5px solid #e5e7eb', padding: '1.1rem 1.2rem', background: '#fff'}}
              />
            </label>
            <label className="gq-label" style={{fontWeight: 600, color: '#22223b', marginBottom: 2}}>
              Email
              <input
                className="gq-input"
                name="email"
                type="email"
                value={client.email}
                onChange={handleClientChange}
                disabled={loading}
                required
                placeholder="Ej: juan@email.com"
                style={{marginTop: 6, fontSize: '1.09em', borderRadius: 12, border: '1.5px solid #e5e7eb', padding: '1.1rem 1.2rem', background: '#fff'}}
              />
            </label>
            <label className="gq-label" style={{fontWeight: 600, color: '#22223b', marginBottom: 2}}>
              Teléfono
              <input
                className="gq-input"
                name="phone"
                value={client.phone}
                onChange={handleClientChange}
                disabled={loading}
                required
                placeholder="Ej: 11 2345-6789"
                style={{marginTop: 6, fontSize: '1.09em', borderRadius: 12, border: '1.5px solid #e5e7eb', padding: '1.1rem 1.2rem', background: '#fff'}}
              />
            </label>
          </div>
          {clientError && <div className="gq-error">{clientError}</div>}
          <button className="gq-submit-btn" type="submit" disabled={loading} style={{marginTop: 18}}>
            {loading ? "Enviando..." : "Enviar cotización"}
          </button>
        </form>
      )}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div className="gq-success" style={{marginBottom: 18}}>
            ¡Cotización enviada! Te contactaremos pronto.<br />
            <span style={{ fontSize: '1.1em', color: '#666' }}>
              Revisá tu email para ver el detalle de la cotización.
            </span>
          </div>
          <div className="gq-products-listbox" style={{margin: '0 auto', maxWidth: 420}}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '1.08em', color: '#fb923c' }}>Productos cotizados:</div>
            <ul className="gq-products-list">
              {products.map((prod, idx) => (
                <li key={prod + idx} className="gq-product-item" style={{border: 'none', background: '#fff7ed', borderRadius: 8, marginBottom: 6, padding: '0.7rem 1rem'}}>
                  <span className="gq-product-name" style={{color: '#b45309', fontWeight: 700}}>{prod}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
