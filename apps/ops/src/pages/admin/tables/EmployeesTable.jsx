// Libraries
import { useEffect, useState } from "react";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function EmployeesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("employees");
  const { data: employees, loading, error } = useFetchAll("employees");

  console.log("Employees data:", employees);

  // State
  const [localEmployees, setLocalEmployees] = useState([]);

  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  const handleAdd = async (newEmployee) => {
    const created = await createSingle(newEmployee);
    if (created) {
      setLocalEmployees((prev) => [...prev, created]);
    }
  };

  /*   15.197.148.33
   */
  return (
    <>
      <ConstantsTable
        title="Employees"
        items={localEmployees}
        loading={loading}
        error={error}
        onAdd={handleAdd}
      />
    </>
  );
}

export default EmployeesAdmin;
