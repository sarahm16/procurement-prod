import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import PageLayout from "./components/PageLayout";
/* import './App.css'
 */
function App() {
  return (
    <>
      <PageLayout
        title="Test"
        onLogout={() => {}}
        user={{ name: "Sarah" }}
        currentPath="/"
        onNavigate={() => {}}
      ></PageLayout>
    </>
  );
}

export default App;
