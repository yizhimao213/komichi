import { useCallback, useEffect, useMemo, useState } from "react";
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import {
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $getSelectionStyleValueForProperty, $patchStyleText, $setBlocksType } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $selectionTouchesSpoiler,
  $toggleSpoilerSelection,
  collectCommandItems,
} from "@haklex/rich-editor/commands";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@haklex/rich-editor-ui";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Redo2,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  EyeOff,
} from "lucide-react";

const ICON = 15;
const STROKE = 2;
const VISIBLE_INSERT = 5;

const INSERT_ORDER = [
  "Image",
  "Code Block",
  "Table",
  "Link Card",
  "Callout",
  "Banner",
  "Gallery",
  "Video",
  "Mermaid Diagram",
  "Code Snippet",
  "Embed",
  "Whiteboard",
  "Nested Document",
];

const FONTS = [
  { label: "默认", value: "" },
  { label: "宋体", value: '"Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif' },
  { label: "黑体", value: '"Noto Sans CJK SC", "Source Han Sans SC", SimHei, sans-serif' },
  { label: "楷体", value: "KaiTi, STKaiti, serif" },
  { label: "Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: 'ui-monospace, "SF Mono", "Fira Code", monospace' },
];

const BLOCK_LABEL = {
  paragraph: "正文",
  h1: "标题 1",
  h2: "标题 2",
  h3: "标题 3",
  bullet: "无序列表",
  number: "有序列表",
  check: "待办",
  other: "其他",
};

const INITIAL = {
  canUndo: false,
  canRedo: false,
  blockType: "paragraph",
  fontFamily: "",
  elementFormat: "left",
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isCode: false,
  isHighlight: false,
  isSpoiler: false,
};

function fontLabel(value) {
  if (!value) return "默认";
  const hit = FONTS.find((item) => item.value === value);
  if (hit) return hit.label;
  for (const item of FONTS) {
    if (item.value && value.startsWith(item.value.split(",")[0])) return item.label;
  }
  return "默认";
}

function blockTypeOf(node) {
  if ($isHeadingNode(node)) {
    const tag = node.getTag();
    return tag === "h1" || tag === "h2" || tag === "h3" ? tag : "other";
  }
  if ($isListNode(node)) {
    const type = node.getListType();
    return type === "bullet" || type === "number" || type === "check" ? type : "other";
  }
  return node.getType() === "paragraph" ? "paragraph" : "other";
}

function ToolBtn({ icon, title, shortcut, active, disabled, onClick }) {
  const label = shortcut ? `${title} ${shortcut}` : title;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!active}
      className={active ? "hx-tb-btn is-on" : "hx-tb-btn"}
      disabled={disabled}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {icon}
    </button>
  );
}

function ToolMenu({ label, title, items, width }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="hx-tb-menu"
        style={width ? { width } : undefined}
        title={title}
      >
        {label}
        <ChevronDown size={12} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={4}>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className={item.active ? "is-on" : undefined}
            style={item.style}
            onClick={item.onSelect}
          >
            {item.icon ? <span className="hx-tb-item-icon">{item.icon}</span> : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sep() {
  return <div className="hx-tb-sep" />;
}

export default function HaklexToolbar({ editor }) {
  const [state, setState] = useState(INITIAL);

  const readState = useCallback(() => {
    try {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchor = selection.anchor.getNode();
      let element =
        anchor.getKey() === "root"
          ? anchor
          : $findMatchingParent(anchor, (node) => {
              const parent = node.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });
      if (!element) {
        try {
          element = anchor.getTopLevelElementOrThrow();
        } catch {
          return;
        }
      }
      if ($isListNode(element) || $isListItemNode(element)) {
        const list = $findMatchingParent(anchor, $isListNode);
        if (list) element = list;
      }
      const next = {
        blockType: blockTypeOf(element),
        fontFamily: $getSelectionStyleValueForProperty(selection, "font-family", "") || "",
        elementFormat: $isElementNode(element) ? element.getFormatType() : "left",
        isBold: selection.hasFormat("bold"),
        isItalic: selection.hasFormat("italic"),
        isUnderline: selection.hasFormat("underline"),
        isStrikethrough: selection.hasFormat("strikethrough"),
        isCode: selection.hasFormat("code"),
        isHighlight: selection.hasFormat("highlight"),
        isSpoiler: $selectionTouchesSpoiler(selection),
      };
      setState((prev) => ({ ...prev, ...next }));
    } catch {
      /* ignore selection races */
    }
  }, []);

  useEffect(() => {
    if (!editor) return undefined;
    return mergeRegister(
      editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
        setState((prev) => ({ ...prev, canUndo: payload }));
        return false;
      }, COMMAND_PRIORITY_LOW),
      editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
        setState((prev) => ({ ...prev, canRedo: payload }));
        return false;
      }, COMMAND_PRIORITY_LOW),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          readState();
        });
      })
    );
  }, [editor, readState]);

  const insertItems = useMemo(() => {
    if (!editor) return [];
    try {
      const items = collectCommandItems(editor).filter(
        (item) => item.placement?.includes("toolbar") && item.group === "insert"
      );
      return items.sort((a, b) => {
        const left = INSERT_ORDER.indexOf(a.title);
        const right = INSERT_ORDER.indexOf(b.title);
        return (left === -1 ? Infinity : left) - (right === -1 ? Infinity : right);
      });
    } catch {
      return [];
    }
  }, [editor]);

  const fontItems = useMemo(
    () =>
      FONTS.map((item) => ({
        label: item.label,
        active: state.fontFamily === item.value,
        style: item.value ? { fontFamily: item.value } : undefined,
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, { "font-family": item.value || "" });
            }
          });
        },
      })),
    [editor, state.fontFamily]
  );

  const setHeading = useCallback(
    (tag) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (tag === "paragraph") {
          $setBlocksType(selection, () => $createParagraphNode());
          return;
        }
        $setBlocksType(selection, () => $createHeadingNode(tag));
      });
    },
    [editor]
  );

  const blockItems = useMemo(
    () => [
      {
        label: "正文",
        icon: <Type size={ICON} strokeWidth={STROKE} />,
        active: state.blockType === "paragraph",
        onSelect: () => setHeading("paragraph"),
      },
      {
        label: "标题 1",
        icon: <Heading1 size={ICON} strokeWidth={STROKE} />,
        active: state.blockType === "h1",
        onSelect: () => setHeading("h1"),
      },
      {
        label: "标题 2",
        icon: <Heading2 size={ICON} strokeWidth={STROKE} />,
        active: state.blockType === "h2",
        onSelect: () => setHeading("h2"),
      },
      {
        label: "标题 3",
        icon: <Heading3 size={ICON} strokeWidth={STROKE} />,
        active: state.blockType === "h3",
        onSelect: () => setHeading("h3"),
      },
    ],
    [setHeading, state.blockType]
  );

  const shown = insertItems.slice(0, VISIBLE_INSERT);
  const extra = insertItems.slice(VISIBLE_INSERT);

  if (!editor) return null;

  return (
    <div className="hx-toolbar" role="toolbar" aria-label="编辑器工具栏">
        <div className="hx-toolbar-row">
          <ToolMenu items={fontItems} label={fontLabel(state.fontFamily)} title="字体" width={76} />
          <Sep />
          <ToolMenu items={blockItems} label={BLOCK_LABEL[state.blockType] ?? "正文"} title="块类型" width={120} />
          <Sep />
          <ToolBtn
            disabled={!state.canUndo}
            icon={<Undo2 size={ICON} strokeWidth={STROKE} />}
            shortcut="Ctrl+Z"
            title="撤销"
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          />
          <ToolBtn
            disabled={!state.canRedo}
            icon={<Redo2 size={ICON} strokeWidth={STROKE} />}
            shortcut="Ctrl+Y"
            title="重做"
            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          />
          <Sep />
          <ToolBtn
            active={state.isBold}
            icon={<Bold size={ICON} strokeWidth={STROKE} />}
            shortcut="Ctrl+B"
            title="粗体"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
          />
          <ToolBtn
            active={state.isItalic}
            icon={<Italic size={ICON} strokeWidth={STROKE} />}
            shortcut="Ctrl+I"
            title="斜体"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
          />
          <ToolBtn
            active={state.isUnderline}
            icon={<Underline size={ICON} strokeWidth={STROKE} />}
            shortcut="Ctrl+U"
            title="下划线"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
          />
          <ToolBtn
            active={state.isStrikethrough}
            icon={<Strikethrough size={ICON} strokeWidth={STROKE} />}
            title="删除线"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
          />
          <ToolBtn
            active={state.isCode}
            icon={<Code size={ICON} strokeWidth={STROKE} />}
            title="行内代码"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
          />
          <Sep />
          <ToolBtn
            active={state.isHighlight}
            icon={<Highlighter size={ICON} strokeWidth={STROKE} />}
            title="高亮"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "highlight")}
          />
          <ToolBtn
            active={state.isSpoiler}
            icon={<EyeOff size={ICON} strokeWidth={STROKE} />}
            title="剧透"
            onClick={() => editor.update(() => $toggleSpoilerSelection())}
          />
          <Sep />
          <ToolBtn
            active={state.blockType === "bullet"}
            icon={<List size={ICON} strokeWidth={STROKE} />}
            title="无序列表"
            onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
          />
          <ToolBtn
            active={state.blockType === "number"}
            icon={<ListOrdered size={ICON} strokeWidth={STROKE} />}
            title="有序列表"
            onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
          />
          <ToolBtn
            active={state.blockType === "check"}
            icon={<CheckSquare size={ICON} strokeWidth={STROKE} />}
            title="待办列表"
            onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}
          />
          <Sep />
          <ToolBtn
            active={state.elementFormat === "left" || state.elementFormat === ""}
            icon={<AlignLeft size={ICON} strokeWidth={STROKE} />}
            title="左对齐"
            onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
          />
          <ToolBtn
            active={state.elementFormat === "center"}
            icon={<AlignCenter size={ICON} strokeWidth={STROKE} />}
            title="居中"
            onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
          />
          <ToolBtn
            active={state.elementFormat === "right"}
            icon={<AlignRight size={ICON} strokeWidth={STROKE} />}
            title="右对齐"
            onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
          />
          <ToolBtn
            active={state.elementFormat === "justify"}
            icon={<AlignJustify size={ICON} strokeWidth={STROKE} />}
            title="两端对齐"
            onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}
          />
          {shown.length > 0 ? (
            <>
              <Sep />
              {shown.map((item) => (
                <ToolBtn
                  key={item.title}
                  icon={item.icon}
                  shortcut={item.shortcut}
                  title={item.title}
                  onClick={() => item.onSelect(editor, "")}
                />
              ))}
              {extra.length > 0 ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="hx-tb-btn" title="更多">
                    <MoreHorizontal size={ICON} strokeWidth={STROKE} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent positionMethod="fixed" sideOffset={4}>
                    {extra.map((item) => (
                      <DropdownMenuItem key={item.title} onClick={() => item.onSelect(editor, "")}>
                        {item.icon ? <span className="hx-tb-item-icon">{item.icon}</span> : null}
                        {item.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
  );
}
