export function InputError({ message }) {
  if (!message) return null
  return <span className="input-error">{message}</span>
}

export function InputSuccess({ message }) {
  if (!message) return null
  return <span className="input-success">{message}</span>
}

export function FormField({ 
  label, 
  type = 'text', 
  error, 
  success,
  required,
  ...props 
}) {
  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      <input 
        type={type} 
        className={`form-input${error ? ' form-input--error' : ''}${success ? ' form-input--success' : ''}`}
        aria-invalid={!!error}
        {...props}
      />
      {error && <InputError message={error} />}
      {success && <InputSuccess message={success} />}
    </div>
  )
}
