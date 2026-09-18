import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import FindTutors from "./pages/FindTutors";
import TutorProfile from "./pages/TutorProfile";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import EnrolledSubjects from "./pages/EnrolledSubjects";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/tutors" element={<FindTutors />} />
        <Route path="/tutors/:id" element={<TutorProfile />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/messages" element={<Messages />} />
          <Route path="/enrolled-subjects" element={<EnrolledSubjects />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;