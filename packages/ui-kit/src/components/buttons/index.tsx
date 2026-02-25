import { Button } from './button';
import type { ButtonProps } from './types';

export { Button } from './button';
export type { ButtonProps, ButtonVariant } from './types';

type VariantButtonProps = Omit<ButtonProps, 'variant'>;

export const PrimaryButton = (props: VariantButtonProps) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton = (props: VariantButtonProps) => (
  <Button {...props} variant="secondary" />
);

export const TertiaryButton = (props: VariantButtonProps) => (
  <Button {...props} variant="tertiary" />
);

export const TintedButton = (props: VariantButtonProps) => (
  <Button {...props} variant="tinted" />
);
