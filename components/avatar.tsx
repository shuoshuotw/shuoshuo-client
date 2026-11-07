// The site's own account (its name is reserved, §6.7): it always shows the 說說 mark (assets/shuoshuo-icon.svg on the
// logo's paper), whatever picture its sign-in provider has
const OFFICIAL_NAME = "說說官方";
const OFFICIAL_AVATAR = "/official-avatar.svg";

/** A person's picture, or the first character of their name where there is none. */
export function Avatar({ url, name, size = 32 }: { url: string | null | undefined; name: string; size?: number }) {
  const style = { width: size, height: size };
  const src = name === OFFICIAL_NAME ? OFFICIAL_AVATAR : url;
  // eslint-disable-next-line @next/next/no-img-element -- provider avatars, sized here; next/image would proxy them through this server
  if (src) return <img className="avatar" src={src} alt="" width={size} height={size} style={style} referrerPolicy="no-referrer" />;
  return (
    <span className="avatar avatar-blank" style={style} aria-hidden="true">
      {Array.from(name)[0]}
    </span>
  );
}
