import type { ButtonProps } from './types';

export const PrimaryButton = ({
  children,
  onClick,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={`alien-button alien-button-primary ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
