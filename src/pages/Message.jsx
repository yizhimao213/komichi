import { useState } from "react";

export default function Message() {
  const [hint, setHint] = useState("你说的每一句，我都会听。");
  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">要不要在这里安静地留下一点什么</p>
        <h1>留言</h1>
        <p>远方的朋友，你好。这里可以随便说。</p>
      </header>
      <form
        className="comment-box"
        style={{ marginBottom: 80 }}
        onSubmit={(e) => {
          e.preventDefault();
          setHint("已留下痕迹。预览站只会保存在这一页。");
          e.currentTarget.reset();
        }}
      >
        <textarea name="message" placeholder="留下痕迹。" />
        <div className="row">
          <span>{hint}</span>
          <button className="btn btn-accent" type="submit">留下痕迹</button>
        </div>
      </form>
    </main>
  );
}
