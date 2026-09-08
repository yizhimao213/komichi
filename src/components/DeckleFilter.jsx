export default function DeckleFilter() {
  return (
    <svg aria-hidden="true" className="ni-deckle-svg" height="0" width="0">
      <defs>
        <filter id="deckle-edge">
          <feTurbulence baseFrequency="0.04" numOctaves="3" result="turb" seed="7" type="turbulence" />
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
