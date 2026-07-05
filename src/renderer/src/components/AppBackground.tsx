// Static (non-animated) grainy dark gradient behind the whole app.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}")`

export default function AppBackground(): React.JSX.Element {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(135% 110% at 32% -10%, #24211c 0%, #1a1814 42%, #141310 72%, #0f0e0c 100%)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: GRAIN, opacity: 0.08, mixBlendMode: 'overlay' }}
      />
    </div>
  )
}
