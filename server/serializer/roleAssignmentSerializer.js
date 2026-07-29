const serializeRoleAssignment = (roleAssignment) => {
  return {
    internal_role_id: roleAssignment.internal_role_id,
    role_assignment_id: roleAssignment.id,
    role_name: roleAssignment.Role?.name,
    employee_name: roleAssignment.Employee?.name,
  };
};

export default serializeRoleAssignment;
