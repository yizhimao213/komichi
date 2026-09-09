import { useState } from "react";
import HaklexEditor from "../haklex/HaklexEditor.jsx";

export default function Message() {
  const [hint, setHint] = useState("你说的每一句，我都会听。");
  const [draft, setDraft] = useState(null);

  const leaveTrace = () => {
    if (!draft) {
      setHint("先写一句再留下痕迹。");
      return;
    }
    setHint("已留下痕迹。预览站只会保存在这一页。");
  };

  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">要不要在这里安静地留下一点什么</p>
        <h1>留言</h1>
        <p>远方的朋友，你好。这里可以随便说。</p>
      </header>
      <div className="comment-box haklex-comment" style={{ marginBottom: 80 }}>
        <HaklexEditor
          placeholder="留下痕迹。"
          variant="comment"
          onChange={setDraft}
          onSubmit={leaveTrace}
        />
        <div className="row">
          <span>{hint}</span>
          <button className="btn btn-accent" type="button" onClick={leaveTrace}>
            留下痕迹
          </button>
        </div>
      </div>
    </main>
  );
}
