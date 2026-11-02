// ISR bound from SPEC §10.5
export const revalidate = 60;

export default function HomePage() {
  return (
    <main className="p-8">
      <p className="quote quote-row">說說，讓文字不僅止於說說</p>
      <p data-testid="rendered-at">{new Date().toISOString()}</p>
    </main>
  );
}
