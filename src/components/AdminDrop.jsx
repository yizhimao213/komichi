import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

function filesFromList(list) {
  return Array.from(list || []).filter(Boolean);
}

function filesFromClipboard(e) {
  const dt = e.clipboardData;
  if (!dt) return [];
  if (dt.files?.length) return filesFromList(dt.files);
  const out = [];
  for (const item of dt.items || []) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) out.push(file);
  }
  return out;
}

function typingTarget(node) {
  if (!node || node === document.body) return false;
  if (node.isContentEditable) return true;
  const tag = String(node.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function matchAccept(file, accept) {
  if (!accept) return true;
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  return accept.split(",").some((raw) => {
    const rule = raw.trim().toLowerCase();
    if (!rule) return false;
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    if (rule.startsWith(".")) return name.endsWith(rule);
    return type === rule;
  });
}

export default function AdminDrop({
  accept = "",
  multiple = true,
  disabled = false,
  compact = false,
  windowPaste = false,
  inputRef,
  label = "拖到这里，点选，或粘贴",
  onPick,
}) {
  const localRef = useRef(null);
  const fileRef = inputRef || localRef;
  const [over, setOver] = useState(false);

  const emit = useCallback(
    (list) => {
      if (disabled || !onPick) return;
      const incoming = filesFromList(list).filter((file) => matchAccept(file, accept));
      if (!incoming.length) return;
      onPick(multiple ? incoming : incoming.slice(0, 1));
    },
    [accept, disabled, multiple, onPick]
  );

  useEffect(() => {
    if (!windowPaste) return undefined;
    const onPaste = (e) => {
      if (e.defaultPrevented) return;
      if (disabled) return;
      if (typingTarget(e.target)) return;
      const files = filesFromClipboard(e);
      if (!files.length) return;
      e.preventDefault();
      emit(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, emit, windowPaste]);

  return (
    <>
      <input
        ref={fileRef}
        className="adm-file-input"
        type="file"
        accept={accept || undefined}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        className={`adm-drop${compact ? " is-compact" : ""}${over ? " is-on" : ""}${disabled ? " is-off" : ""}`}
        tabIndex={0}
        role="button"
        onClick={() => {
          if (!disabled) fileRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          emit(e.dataTransfer.files);
        }}
        onPaste={(e) => {
          const files = filesFromClipboard(e);
          if (!files.length) return;
          e.preventDefault();
          emit(files);
        }}
      >
        <Upload size={compact ? 14 : 18} strokeWidth={1.8} />
        <span>{label}</span>
      </div>
    </>
  );
}
