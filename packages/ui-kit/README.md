# @alien_org/ui-kit

UI components for Alien miniapps.

## Installation

```bash
bun add @alien_org/ui-kit
# or
npm install @alien_org/ui-kit
```

### Usage

Import the component and styles, then use `BottomSheet` with a `renderTrigger` and children:

```tsx
import { BottomSheet } from "@alien_org/ui-kit";
import "@alien_org/ui-kit/styles.css";

function App() {
  return (
    <BottomSheet
      renderTrigger={(props) => (
        <button
          {...props}
          type="button"
          className="send-button"
          style={{ marginBottom: 0 }}
        >
          Open Bottom Sheet
        </button>
      )}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem" }}>
          Bottom Sheet Test
        </h3>
        <p style={{ color: "rgba(255,255,255,0.7)", margin: 0 }}>
          This drawer is from <code>@alien_org/ui-kit</code>. Drag the handle or
          tap outside to close.
        </p>
      </div>
    </BottomSheet>
  );
}
```

Our BottomSheet is built on vaul-base, and all underlying sub-components are attached for full flexibility, specifically, `Close`, `Title` and `Description` components are avaliable.

```tsx
import { BottomSheet } from "@alien_org/ui-kit";
import "@alien_org/ui-kit/styles.css";

function App() {
  return (
    <BottomSheet
      renderTrigger={(props) => (
        <button
          {...props}
          type="button"
          className="send-button"
          style={{ marginBottom: 0 }}
        >
          Open Bottom Sheet
        </button>
      )}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem" }}>
          Bottom Sheet Test
        </h3>
        <p style={{ color: "rgba(255,255,255,0.7)", margin: 0 }}>
          This drawer is from <code>@alien_org/ui-kit</code>. Drag the handle or
          tap outside to close.
        </p>
        <BottomSheet.Close
          render={(props) => (
            <button {...props} type="button" className="drawer-test-button">
              Got it
            </button>
          )}
        />
      </div>
    </BottomSheet>
  );
}
```

### Props

| Prop            | Type                   | Description                                                                                                         |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `renderTrigger` | `(props) => ReactNode` | Render prop for the trigger element. Spread `props` onto your trigger (e.g. a button) so the drawer opens on click. |
| `children`      | `ReactNode`            | Content rendered inside the drawer.                                                                                 |

### Notes

- **Styles are required.** Import `@alien_org/ui-kit/styles.css` in your app entry (e.g. `main.tsx`) or in the file where you use `BottomSheet`. Clicking on "Open Bottom Sheet" button and nothing happens? You are probably missing the styles import.
- The drawer uses `vaul-base` under the hood. Drag the handle or tap the overlay to close.
