import { inputStyle, labelStyle, colors } from "../styles/theme.js";

export default function FormInput({ label, value, onChange, type = "text", placeholder, required, disabled, error, style = {}, inputProps = {} }) {
  const id = label ? label.toLowerCase().replace(/\s+/g, "-") : undefined;
  return (
    <div style={style}>
      {label && <label htmlFor={id} style={labelStyle}>{label}{required && <span style={{ color: colors.red }}> *</span>}</label>}
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        style={{ ...inputStyle, borderColor: error ? colors.red : colors.inputBorder, ...inputProps }}
      />
      {error && <div style={{ fontSize: 11, color: colors.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
