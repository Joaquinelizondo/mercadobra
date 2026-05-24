
import React, { useState } from "react";
import "../styles/GroupQuote.css";
import { createLead } from "../lib/api";

// Cotizador libre: permite ingresar necesidades como "chips" y cotizar
const GroupQuoteWidget = () => {
  const [needs, setNeeds] = useState([]); // Cada necesidad es un string
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });

  const handleInputKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!needs.includes(input.trim())) {
        setNeeds([...needs, input.trim()]);
      }
      setInput("");
    }
  };

  const handleRemoveNeed = (idx) => {
    setNeeds(needs.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim()) {
        setError("Completá tus datos de contacto para enviar la cotización.");
        setLoading(false);
        return;
      }
      if (needs.length === 0) {
        setError("Agregá al menos una necesidad para cotizar.");
        setLoading(false);
        return;
      }
      await createLead({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        message: `Cotización libre desde widget.\nNecesidades: ${needs.join(", ")}`,
        plan: "cotizador-libre",
        source: "group-quote-widget-libre",
        products: needs.map((n) => ({ name: n })),
      });
      setSuccess(true);
      setNeeds([]);
      setContact({ name: "", email: "", phone: "" });
    } catch (err) {
      setError("Ocurrió un error al enviar la cotización. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="group-quote-widget">
      <h2 className="gq-title">Cotizá lo que necesitás</h2>
      <form className="gq-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="gq-chips-row">
          {needs.map((need, idx) => (
            <span className="gq-chip" key={idx}>
              {need}
              <button type="button" className="gq-chip-remove" onClick={() => handleRemoveNeed(idx)} aria-label="Eliminar necesidad">×</button>
            </span>
          ))}
          <input
            className="gq-input"
            type="text"
            placeholder={needs.length === 0 ? "Ej: cemento, pintura, hierro..." : "Agregá otra necesidad"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={loading}
          />
        </div>
        <div className="gq-contact-row">
          <input
            className="gq-contact-input"
            type="text"
            placeholder="Nombre y apellido"
            value={contact.name}
            onChange={e => setContact({ ...contact, name: e.target.value })}
            disabled={loading}
            required
          />
          <input
            className="gq-contact-input"
            type="email"
            placeholder="Email"
            value={contact.email}
            onChange={e => setContact({ ...contact, email: e.target.value })}
            disabled={loading}
            required
          />
          <input
            className="gq-contact-input"
            type="tel"
            placeholder="Teléfono"
            value={contact.phone}
            onChange={e => setContact({ ...contact, phone: e.target.value })}
            disabled={loading}
            required
          />
        </div>
        {error && <div className="gq-error">{error}</div>}
        {success && <div className="gq-success">¡Cotización enviada! Te contactaremos pronto.</div>}
        <button className="gq-submit-btn" type="submit" disabled={loading}>{loading ? "Enviando..." : "Cotizar"}</button>
      </form>
    </div>
  );
};

export default GroupQuoteWidget;
