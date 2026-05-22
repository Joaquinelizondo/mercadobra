import React, { useState } from "react";
import ProductCard from "./ProductCard";
import "../styles/GroupQuote.css";

/**
 * GroupQuoteWidget - Cotizador grupal premium
 * Permite a los clientes agregar múltiples productos a una cotización, verlos como tarjetas visuales, editar cantidades y enviar una sola solicitud de cotización.
 */
const GroupQuoteWidget = ({ products, onSubmit }) => {
  const [quoteItems, setQuoteItems] = useState(products.map(p => ({ ...p, quantity: 1 })));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
      await onSubmit(quoteItems);
      setSuccess(true);
      setQuoteItems([]);
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
        <div className="gq-products">
          {quoteItems.length === 0 ? (
            <div className="gq-empty">Agrega productos para cotizar.</div>
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
        <div className="gq-actions">
          <button type="submit" className="gq-submit" disabled={loading || quoteItems.length === 0}>
            {loading ? "Enviando..." : "Solicitar Cotización"}
          </button>
        </div>
        {success && <div className="gq-success">¡Cotización enviada con éxito!</div>}
        {error && <div className="gq-error">{error}</div>}
      </form>
    </div>
  );
};

export default GroupQuoteWidget;
