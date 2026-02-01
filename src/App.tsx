function usePath() {
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return path;
}

function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Plan Invitación</h1>
      <button
        className="mt-4 rounded bg-black text-white px-4 py-2"
        onClick={() => navigate("/create")}
      >
        Crear un plan
      </button>
    </div>
  );
}

function Create() {
  return <div className="p-8">Pantalla crear plan (próximo paso)</div>;
}

function Invite() {
  const code = window.location.pathname.split("/").pop();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Invitación</h1>
      <p>Código: {code}</p>
      <p>(Acá va el flujo de decisiones)</p>
    </div>
  );
}

function Expired() {
  return <div className="p-8">Esta invitación ya no está disponible</div>;
}

export default function App() {
  const path = usePath();

  if (path.startsWith("/invite/")) return <Invite />;
  if (path === "/create") return <Create />;
  if (path === "/expired") return <Expired />;

  return <Home />;
}
