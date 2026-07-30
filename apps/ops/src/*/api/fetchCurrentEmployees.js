import axios from "axios";

const groupId = "4aa44b4c-0655-4769-aae2-9030e4276471"; //EVB-ALL

const getMicrosoftAccessToken = async () => {
  try {
    const tokenResponse = await axios.post(
      `${import.meta.env.VITE_PROXY_URL}/${
        import.meta.env.VITE_AZURE_FUNCTIONS_URL
      }/dynamicGetAuth`,
      {
        company: "Evergreen Brands",
      },
    );
    const accessToken = tokenResponse.data?.access_token;

    return accessToken;
  } catch (err) {
    console.error("Error fetching Microsoft auth token:", err);
    throw new Error("Failed to fetch Microsoft auth token");
  }
};

async function fetchCurrentEmployees() {
  const token = await getMicrosoftAccessToken();
  console.log("token", token);

  const membersOfEvergreenBrands = await axios.get(
    `https://graph.microsoft.com/v1.0/groups/${groupId}/members`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  console.log("membersOfEvergreenBrands", membersOfEvergreenBrands.data);

  const sqlEmployees = await axios.get("/api/employees");
  console.log("sqlEmployees", sqlEmployees.data);

  const newEmployees = membersOfEvergreenBrands.data.value
    .filter(
      (member) =>
        !sqlEmployees.data.some(
          (employee) => employee.ms_user_id === member.id,
        ),
    )
    .map((member) => ({
      email: member.mail,
      ms_user_id: member.id,
      name: member.displayName,
    }));
  console.log("newEmployees", newEmployees);

  const terminatedEmployees = sqlEmployees.data
    .filter(
      (employee) =>
        !membersOfEvergreenBrands.data.value.some(
          (member) => employee.ms_user_id === member.id,
        ),
    )
    .map((employee) => employee.id);
  console.log("terminatedEmployees", terminatedEmployees);

  console.log({ newEmployees, terminatedEmployees });

  const syncResult = await axios.post("/api/employees/sync", {
    newEmployees,
    terminatedEmployees,
  });
  console.log("syncResult", syncResult.data);
}

export default fetchCurrentEmployees;
