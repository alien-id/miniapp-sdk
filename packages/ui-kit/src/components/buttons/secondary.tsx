import type { ButtonProps } from './types';

export const SecondaryButton = ({
  children,
  onClick,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={`alien-button alien-button-secondary ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
