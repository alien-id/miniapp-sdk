import type { ComponentProps, ReactNode } from "react";
import { Drawer } from "vaul-base";
import "./bottom-sheet.css";

interface BottomSheetProps {
  renderTrigger: ComponentProps<typeof Drawer.Trigger>["render"];
  children: ReactNode;
}

export const BottomSheet = ({ renderTrigger, children }: BottomSheetProps) => {
  return (
    <Drawer.Root>
      <Drawer.Trigger render={renderTrigger} />
      <Drawer.Portal>
        <Drawer.Overlay className="bottomsheet-overlay" />
        <Drawer.Content className="bottomsheet-content">
          <div className="bottomsheet-inner">
            <Drawer.Handle className="bottomsheet-handle" />
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
