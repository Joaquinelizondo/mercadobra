
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


  return null;
};

export default GroupQuoteWidget;
