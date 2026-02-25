import type { ButtonProps } from './types';

export const TintedButton = ({
  children,
  onClick,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={`alien-button alien-button-tinted ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
