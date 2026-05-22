
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
    <div className="group-quote-widget premium">
      <h2 className="gq-title">Cotizador Grupal</h2>
      <form onSubmit={handleSubmit} className="gq-form">
        <div className="gq-contact-row">
          <input
            className="gq-contact-input"
            type="text"
            placeholder="Tu nombre y apellido"
            value={contact.name}
            onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
            required
          />
          <input
            className="gq-contact-input"
            type="email"
            placeholder="Tu email"
            value={contact.email}
            onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
            required
          />
          <input
            className="gq-contact-input"
            type="tel"
            placeholder="Tu WhatsApp"
            value={contact.phone}
            onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
            required
          />
        </div>
        <div className="gq-actions" style={{ marginBottom: '1.2rem', justifyContent: 'flex-start' }}>
          <button type="submit" className="gq-submit" disabled={loading || quoteItems.length === 0}>
            {loading ? "Enviando..." : "Solicitar Cotización"}
          </button>
        </div>
        <div className="gq-autocomplete">
          <input
            type="text"
            className="gq-autoinput"
            placeholder="Buscar producto para agregar..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            autoComplete="off"
          />
          {showDropdown && search.length > 1 && filteredProducts.length > 0 && (
            <ul className="gq-autodrop">
              {filteredProducts.slice(0, 8).map((p) => (
                <li key={p.id} onClick={() => handleAddProduct(p)}>
                  <span>{p.name}</span> <small style={{ color: '#888' }}>({p.company})</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="gq-products">
          {quoteItems.length === 0 ? (
            <div className="gq-empty">Agregá productos usando el buscador de arriba.</div>
          ) : (
            quoteItems.map(item => (
              <div className="gq-card" key={item.id}>
                <ProductCard product={item} minimal />
                <div className="gq-controls">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                    className="gq-qty"
                  />
                  <button type="button" className="gq-remove" onClick={() => handleRemove(item.id)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {success && <div className="gq-success">¡Cotización enviada con éxito!</div>}
        {error && <div className="gq-error">{error}</div>}
      </form>
    </div>
  );
};

  return (
    <form className="gq-widget" onSubmit={handleSubmit} autoComplete="off">
      <h3 className="gq-title">Cotizá lo que necesitás</h3>
      {success && <div className="gq-success">¡Cotización enviada! Te contactaremos pronto.</div>}
      {error && <div className="gq-error">{error}</div>}
      <div className="gq-contact">
        <input
          className="gq-contact-input"
          type="text"
          placeholder="Tu nombre"
          value={contact.name}
          onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
          required
        />
        <input
          className="gq-contact-input"
          type="email"
          placeholder="Tu email"
          value={contact.email}
          onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
          required
        />
        <input
          className="gq-contact-input"
          type="tel"
          placeholder="Tu WhatsApp"
          value={contact.phone}
          onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
          required
        />
      </div>
      <div className="gq-needs-box">
        <input
          type="text"
          className="gq-autoinput"
          placeholder="Escribí lo que necesitás y presioná Enter..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          autoComplete="off"
        />
        <div className="gq-needs-list">
          {needs.map((need, idx) => (
            <span className="gq-need-chip" key={idx}>
              {need}
              <button type="button" className="gq-remove-chip" onClick={() => handleRemoveNeed(idx)} title="Quitar">×</button>
            </span>
          ))}
        </div>
      </div>
      <div className="gq-actions" style={{ marginBottom: '1.2rem', justifyContent: 'flex-start' }}>
        <button type="submit" className="gq-submit" disabled={loading || needs.length === 0}>
          {loading ? "Enviando..." : "Solicitar Cotización"}
        </button>
      </div>
    </form>
  );
