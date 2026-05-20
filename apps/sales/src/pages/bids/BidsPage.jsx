import { Typography } from "@mui/material";
import GeneralPageLayout from "../../components/GeneralPageLayout";

function BidsPage() {
  return (
    <>
      <GeneralPageLayout>
        <Typography variant="h4" gutterBottom>
          Bids Page
        </Typography>
        <Typography variant="body1">
          This is the Bids page. Content will go here.
        </Typography>
      </GeneralPageLayout>
    </>
  );
}

export default BidsPage;
