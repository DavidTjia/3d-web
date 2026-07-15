import "./Button.css";

/**
 * Reusable button component.
 *
 * The component supports multiple visual variants while
 * keeping the markup consistent across the application.
 */
function Button({ children, variant = "primary", type = "button", onClick }) {
  return (
    <button
      className={`button button--${variant}`}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
