"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  required = false,
  minLength,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      {label ? (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
