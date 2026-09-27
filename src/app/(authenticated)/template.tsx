// Remounts on every navigation, so each page's sections fade in one after another.
export default function AuthenticatedTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="stagger flex flex-col gap-6">{children}</div>;
}
