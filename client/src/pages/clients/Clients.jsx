// Components
import ListPageHeader from "../../components/ListPageHeader";
import ListDataGrid from "../../components/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout";

function Clients() {
  return (
    <>
      <ListPageLayout>
        <ListDataGrid rows={[]} columns={[]} loading={false} />
      </ListPageLayout>
    </>
  );
}

export default Clients;
