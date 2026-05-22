import React, { useState } from "react";
import { useProducts } from "../context/ProductContext";
import ProductCard from "./ProductCard";
import "../styles/GroupQuote.css";

/**
 * GroupQuoteWidget - Cotizador grupal premium
 * Permite a los clientes agregar múltiples productos a una cotización, verlos como tarjetas visuales, editar cantidades y enviar una sola solicitud de cotización.
 */
import { createLead } from "../lib/api";
const GroupQuoteWidget = ({ products, onSubmit }) => {
  const { productList } = useProducts();
  const [quoteItems, setQuoteItems] = useState(products.map(p => ({ ...p, quantity: 1 })));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  // Productos disponibles para agregar (no repetidos)
  const availableProducts = productList.filter(
    (p) => !quoteItems.some((item) => item.id === p.id)
  );
  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.company.toLowerCase().includes(search.toLowerCase())
  );
  const handleAddProduct = (product) => {
    setQuoteItems((items) => [...items, { ...product, quantity: 1 }]);
    setSearch("");
    setShowDropdown(false);
  };

  const handleQuantityChange = (id, quantity) => {
    setQuoteItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const handleRemove = id => {
    setQuoteItems(items => items.filter(item => item.id !== id));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // Validación básica
      if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim()) {
        setError("Completá tus datos de contacto para enviar la cotización.");
        setLoading(false);
        return;
      }
      if (quoteItems.length === 0) {
        setError("Agregá al menos un producto para cotizar.");
        setLoading(false);
        return;
      }
      // Enviar a backend como lead
      await createLead({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        message: `Cotización grupal desde widget.\nProductos: ${quoteItems.map(q => `${q.name} x${q.quantity}`).join(", ")}`,
        plan: "cotizador-grupal",
        source: "group-quote-widget",
        products: quoteItems.map(q => ({ id: q.id, name: q.name, quantity: q.quantity, company: q.company })),
      });
      setSuccess(true);
      setQuoteItems([]);
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

export default GroupQuoteWidget;
