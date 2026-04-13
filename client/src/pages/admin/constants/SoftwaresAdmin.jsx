// Libraries
import { useEffect, useState } from "react";
import axios from "axios";

import { Typography } from "@mui/material";

function SoftwaresAdmin() {
  const [softwares, setSoftwares] = useState({
    data: [],
    loading: true,
    error: null,
  });

  const fetchSoftwares = async () => {
    try {
      const softwaresResponse = await axios.get("/api/softwares");
      console.log("Fetched softwares:", softwaresResponse);
      setSoftwares({
        data: softwaresResponse.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.log("Client side error fetching softwares:", error);
    }
  };

  useEffect(() => {
    fetchSoftwares();
  }, []);

  return (
    <>
      <Typography>Softwares Admin</Typography>
    </>
  );
}

export default SoftwaresAdmin;
