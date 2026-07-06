// Libraries
import { useEffect, useState } from "react";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function ContactRolesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("contactRoles");
  const { data: contactRoles, loading, error } = useFetchAll("contactRoles");

  // State
  const [localContactRoles, setLocalContactRoles] = useState([]);

  useEffect(() => {
    setLocalContactRoles(contactRoles);
  }, [contactRoles]);

  const handleAdd = async (newContactRole) => {
    const created = await createSingle(newContactRole);
    if (created) {
      setLocalContactRoles((prev) => [...prev, created]);
    }
  };

  /*   15.197.148.33
   */
  return (
    <>
      <ConstantsTable
        title="Contact Roles"
        items={localContactRoles}
        loading={loading}
        error={error}
        onAdd={handleAdd}
      />
    </>
  );
}

export default ContactRolesAdmin;
