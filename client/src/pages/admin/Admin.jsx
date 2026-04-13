import { useEffect, useState } from "react";

// Libraries
import axios from "axios";

// Components
import ListPageLayout from "../../components/ListPageLayout";

// MUI Components
import Button from "@mui/material/Button";
import SoftwaresAdmin from "./constants/SoftwaresAdmin";

function Admin() {
  const getAllSoftwares = async () => {
    try {
      const softwaresResponse = await axios.get(`/api/softwares`);
      console.log("Fetched softwares:", softwaresResponse.data);
    } catch (error) {
      console.error("Error fetching softwares:", error);
    }
  };

  return (
    <>
      <ListPageLayout>
        <SoftwaresAdmin />
      </ListPageLayout>
    </>
  );
}

export default Admin;
