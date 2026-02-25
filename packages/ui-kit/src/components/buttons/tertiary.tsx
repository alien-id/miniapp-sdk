import type { ButtonProps } from './types';

export const TertiaryButton = ({
  children,
  onClick,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={`alien-button alien-button-tertiary ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
