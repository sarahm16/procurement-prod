import { useEffect } from "react";

// Libraries
import axios from "axios";

// Components
import ListDataGrid from "../../components/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout";

function Clients() {
  useEffect(() => {
    const fetchClients = async () => {
      try {
        /*         const response = await axios.get("/");
        console.log("Server response:", response.data); */
        const response = await axios.get(`/api/clients`);
        console.log("Fetched clients:", response.data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  return (
    <>
      <ListPageLayout>
        <ListDataGrid rows={[]} columns={[]} loading={false} />
      </ListPageLayout>
    </>
  );
}

export default Clients;
