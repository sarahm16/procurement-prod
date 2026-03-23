// Routing
import { Route, Routes } from "react-router-dom";

// Components
import ProtectedLayout from "./components/ProtectedLayout";

// Routes
import Sites from "./pages/sites/Sites";

function App() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Sites />} />
          <Route path="/sites" element={<Sites />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
