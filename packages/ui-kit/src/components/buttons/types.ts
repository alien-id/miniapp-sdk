export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'tinted';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
};
