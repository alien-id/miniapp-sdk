import type { ComponentProps, ReactNode } from 'react';
import { Drawer } from 'vaul-base';
import './bottom-sheet.css';

type DrawerRootProps = ComponentProps<typeof Drawer.Root>;

interface BottomSheetProps {
  renderTrigger?: ComponentProps<typeof Drawer.Trigger>['render'];
  children: ReactNode;
  open?: DrawerRootProps['open'];
  onOpenChange?: DrawerRootProps['onOpenChange'];
  dismissible?: DrawerRootProps['dismissible'];
}

const BottomSheetComponent = ({
  renderTrigger,
  children,
  open,
  onOpenChange,
  dismissible,
}: BottomSheetProps) => {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
    >
      {renderTrigger && <Drawer.Trigger render={renderTrigger} />}
      <Drawer.Portal>
        <Drawer.Overlay className="alien-bottomsheet-overlay" />
        <Drawer.Content className="alien-bottomsheet-content">
          <div className="alien-bottomsheet-inner">
            <Drawer.Handle className="alien-bottomsheet-handle" />
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

BottomSheetComponent.displayName = 'BottomSheet';

const Close = Drawer.Close;
Close.displayName = 'BottomSheet.Close';

const Title = Drawer.Title;
Title.displayName = 'BottomSheet.Title';

const Description = Drawer.Description;
Description.displayName = 'BottomSheet.Description';

type BottomSheet = typeof BottomSheetComponent & {
  Close: typeof Drawer.Close;
  Title: typeof Drawer.Title;
  Description: typeof Drawer.Description;
};

export const BottomSheet: BottomSheet = Object.assign(BottomSheetComponent, {
  Close,
  Title,
  Description,
});
