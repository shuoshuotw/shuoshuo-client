/** A person's picture, or the first character of their name where there is none. */
export function Avatar({ url, name, size = 32 }: { url: string | null | undefined; name: string; size?: number }) {
  const style = { width: size, height: size };
  // eslint-disable-next-line @next/next/no-img-element -- provider avatars, sized here; next/image would proxy them through this server
  if (url) return <img className="avatar" src={url} alt="" width={size} height={size} style={style} referrerPolicy="no-referrer" />;
  return (
    <span className="avatar avatar-blank" style={style} aria-hidden="true">
      {Array.from(name)[0]}
    </span>
  );
}
