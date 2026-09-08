export default function PageLoader() {
  return (
    <div className="boot-screen" aria-hidden="true">
      <div className="boot-inner">
        <div className="boot-rings">
          <span className="boot-dot" />
          <span className="boot-ring boot-ring-a" />
          <span className="boot-ring boot-ring-b" />
          <span className="boot-glow" />
        </div>
        <span className="boot-copy">稍候片刻，四十小路出没。</span>
      </div>
    </div>
  );
}
