import { Component, useCallback } from "react";
import { composeEditor } from "@haklex/rich-compose";
import { allEditorModules } from "@haklex/rich-compose/editor";
import { DialogStackProvider } from "@haklex/rich-editor-ui";
import { NestedDocDialogEditorProvider, NestedDocPlugin } from "@haklex/rich-ext-nested-doc";
import { PollDataProvider } from "@haklex/rich-ext-poll";
import { SlashMenuPlugin } from "@haklex/rich-plugin-slash-menu";
import { pollAdapter } from "./poll.js";
import { useSiteTheme } from "./theme.js";
import "@haklex/rich-compose/style.css";
import "@haklex/rich-editor-ui/style.css";
import "@haklex/rich-plugin-slash-menu/style.css";
import "katex/dist/katex.min.css";

const ComposedEditor = composeEditor({ modules: allEditorModules });

async function localFileUpload(file, opts) {
  opts?.onProgress?.(40);
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
  opts?.onProgress?.(100);
  return { src };
}

const slashPlugins = (
  <>
    <SlashMenuPlugin />
    <NestedDocPlugin />
  </>
);

class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="haklex-editor-error">
          {this.state.error.message || "编辑器未能挂载"}
        </div>
      );
    }
    return this.props.children;
  }
}

function NestedDocDialogEditor({ initialValue, onEditorReady }) {
  return (
    <ComposedEditor
      variant="article"
      initialValue={initialValue}
      onEditorReady={onEditorReady}
      imageUpload={localFileUpload}
      fileUpload={localFileUpload}
    />
  );
}

export default function HaklexEditor({
  placeholder = "开始书写…",
  variant = "comment",
  onChange,
  onSubmit,
  onEditorReady,
  initialValue,
  autoFocus = false,
  slash = false,
  header,
  children,
  className = "",
  contentClassName,
  style,
  actions,
}) {
  const theme = useSiteTheme();
  const handleChange = useCallback(
    (next) => {
      onChange?.(next);
    },
    [onChange]
  );

  return (
    <div className={["haklex-editor", className].filter(Boolean).join(" ")}>
      <EditorErrorBoundary>
        <DialogStackProvider>
          <PollDataProvider adapter={pollAdapter}>
            <NestedDocDialogEditorProvider value={NestedDocDialogEditor}>
              <ComposedEditor
                variant={variant}
                theme={theme}
                placeholder={placeholder}
                initialValue={initialValue}
                autoFocus={autoFocus}
                header={header}
                contentClassName={contentClassName}
                style={style}
                onChange={handleChange}
                onSubmit={onSubmit}
                onEditorReady={onEditorReady}
                imageUpload={localFileUpload}
                fileUpload={localFileUpload}
                videoUpload={localFileUpload}
                actions={actions}
              >
                {slash ? slashPlugins : null}
                {children}
              </ComposedEditor>
            </NestedDocDialogEditorProvider>
          </PollDataProvider>
        </DialogStackProvider>
      </EditorErrorBoundary>
    </div>
  );
}
