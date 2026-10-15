// components/CardComponent.jsx
//
// Kept for the pages that still use it; it now renders the shared
// SectionCard so every card in the app has the same header.
import SectionCard from "./SectionCard";

function CardComponent({
  children,
  title,
  icon,
  action,
  noPadding = false,
  collapsible = false,
  defaultExpanded = true,
}) {
  return (
    <SectionCard
      title={title}
      icon={icon}
      actions={action}
      collapsible={collapsible}
      defaultOpen={defaultExpanded}
      disablePadding={noPadding}
      bodySx={noPadding ? undefined : { p: 2 }}
    >
      {children}
    </SectionCard>
  );
}

export default CardComponent;
