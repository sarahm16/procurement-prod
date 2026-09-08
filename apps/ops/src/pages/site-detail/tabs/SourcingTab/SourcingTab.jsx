import { useEffect } from "react";
import { useSiteActions } from "../../SiteDetailProvider";

function SourcingTab() {
  const { loadSourcing } = useSiteActions();

  useEffect(() => {
    loadSourcing();
  }, []);

  return <></>;
}

export default SourcingTab;
