import React, { useState } from 'react';

/**
 * AuthInput
 * Premium form field: associated label, smooth orange focus treatment,
 * clear invalid state with accessible error message, and an accessible
 * password visibility toggle (type="button" so it never submits the form).
 */

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export default function AuthInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus = false,
  required = false,
  disabled = false,
  minLength,
  error,
  helpText,
  passwordToggle = false,
  labelAction = null,
}) {
  const [visible, setVisible] = useState(false);
  const inputType = passwordToggle ? (visible ? 'text' : 'password') : type;
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;

  return (
    <div className={`fa-field ${error ? 'fa-field--invalid' : ''}`}>
      {labelAction ? (
        <div className="fa-field__label-row">
          <label className="fa-field__label" htmlFor={id}>
            {label}
          </label>
          {labelAction}
        </div>
      ) : (
        <label className="fa-field__label" htmlFor={id}>
          {label}
        </label>
      )}

      <div className="fa-field__wrap">
        <input
          className={`fa-input ${passwordToggle ? 'fa-input--toggle' : ''}`}
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          disabled={disabled}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helpId}
        />

        {passwordToggle && (
          <button
            type="button"
            className="fa-field__toggle"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
            disabled={disabled}
            tabIndex={0}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {helpText && !error && (
        <p className="fa-field__help" id={helpId}>
          {helpText}
        </p>
      )}

      {error && (
        <p className="fa-field__error" id={errorId}>
          <AlertIcon />
          {error}
        </p>
      )}
    </div>
  );
}
