// components/QuickBooks/QuickBooksClientLink.jsx
//
// Kept so pages already using it don't change. New code can use
// <QuickBooksLink kind="clients" … /> directly.
import QuickBooksLink from "./QuickBooksLink";

export default function QuickBooksClientLink({ clientId, clientName, ...rest }) {
  return <QuickBooksLink kind="clients" recordId={clientId} name={clientName} {...rest} />;
}
