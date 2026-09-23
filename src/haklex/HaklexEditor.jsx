import { Component, useCallback, useState } from "react";
import { composeEditor } from "@haklex/rich-compose";
import { allEditorModules } from "@haklex/rich-compose/editor";
import { DialogStackProvider } from "@haklex/rich-editor-ui";
import { NestedDocDialogEditorProvider, NestedDocPlugin } from "@haklex/rich-ext-nested-doc";
import { PollDataProvider } from "@haklex/rich-ext-poll";
import { SlashMenuPlugin } from "@haklex/rich-plugin-slash-menu";
import { MentionPlatformProvider } from "@haklex/rich-renderer-mention/static";
import { mentionPlatforms } from "./mentions.js";
import { pollAdapter } from "./poll.js";
import { useSiteTheme } from "./theme.js";
import HaklexToolbar from "./HaklexToolbar.jsx";
import { uploadFile } from "../contentApi.js";
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

async function libraryFileUpload(file, opts) {
  const saved = await uploadFile(file, opts?.onProgress);
  if (!saved?.url) throw new Error("upload_failed");
  return { src: saved.url };
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
          {this.props.fallback || this.state.error.message || "编辑器未能挂载"}
        </div>
      );
    }
    return this.props.children;
  }
}

function NestedDocDialogEditor({ initialValue, onEditorReady, persistUploads }) {
  const fileUpload = persistUploads ? libraryFileUpload : localFileUpload;
  return (
    <ComposedEditor
      variant="article"
      initialValue={initialValue}
      onEditorReady={onEditorReady}
      imageUpload={fileUpload}
      fileUpload={fileUpload}
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
  toolbar = false,
  header,
  children,
  className = "",
  contentClassName,
  style,
  actions,
  persistUploads = false,
  uploadFn,
}) {
  const theme = useSiteTheme();
  const [editor, setEditor] = useState(null);
  const handleChange = useCallback(
    (next) => {
      onChange?.(next);
    },
    [onChange]
  );
  const handleEditorReady = useCallback(
    (next) => {
      setEditor(next);
      onEditorReady?.(next);
    },
    [onEditorReady]
  );
  const fileUpload = uploadFn ?? (persistUploads ? libraryFileUpload : localFileUpload);

  return (
    <div
      className={["haklex-editor", toolbar || slash ? "has-toolbar" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <EditorErrorBoundary>
        <DialogStackProvider>
          <MentionPlatformProvider platforms={mentionPlatforms}>
          <PollDataProvider adapter={pollAdapter}>
            <NestedDocDialogEditorProvider
              value={(props) => <NestedDocDialogEditor {...props} persistUploads={persistUploads} />}
            >
              <ComposedEditor
                variant={variant}
                theme={theme}
                placeholder={placeholder}
                initialValue={initialValue}
                autoFocus={autoFocus}
                header={
                  header ??
                  (toolbar || slash ? (
                    <EditorErrorBoundary fallback="工具栏未能挂载，正文仍可编辑。">
                      {editor ? <HaklexToolbar editor={editor} /> : null}
                    </EditorErrorBoundary>
                  ) : undefined)
                }
                contentClassName={contentClassName}
                style={style}
                onChange={handleChange}
                onSubmit={onSubmit}
                onEditorReady={handleEditorReady}
                imageUpload={fileUpload}
                fileUpload={fileUpload}
                videoUpload={fileUpload}
                actions={actions}
              >
                {slash ? slashPlugins : null}
                {children}
              </ComposedEditor>
            </NestedDocDialogEditorProvider>
          </PollDataProvider>
          </MentionPlatformProvider>
        </DialogStackProvider>
      </EditorErrorBoundary>
    </div>
  );
}
