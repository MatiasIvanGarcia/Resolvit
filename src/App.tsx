import React from "react";
import { usePath } from "./hooks/usePath";
import { useSession } from "./hooks/useSession";
import { navigate } from "./lib/navigate";
import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { CreateLinear } from "./components/CreateLinear";
import { MyPlans } from "./components/MyPlans";
import { Invite } from "./components/Invite";
import { Expired } from "./components/Expired";
import { PlanResults } from "./components/PlanResults";

export default function App() {
  const path = usePath();
  const session = useSession();

  if (path.startsWith("/invite/")) return <Invite />;
  if (path === "/expired") return <Expired />;

  if (path === "/login") return <Login />;

  if (path.startsWith("/results/")) {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <PlanResults session={session} />;
  }

  if (path === "/plans") {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <MyPlans session={session} />;
  }

  if (path === "/create") {
    if (!session) {
      navigate("/login");
      return null;
    }
    return <CreateLinear session={session} />;
  }

  return <Home session={session} />;
}