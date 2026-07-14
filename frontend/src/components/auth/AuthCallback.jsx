import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const access = params.get("access");
    const refresh = params.get("refresh");

    if (access) {
      localStorage.setItem("access_token", access);

      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }

      window.history.replaceState({}, document.title, "/");

      navigate("/");
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white">
        Connexion à la WCA...
      </p>
    </div>
  );
}