import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");

    if (token) {
      localStorage.setItem("access_token", token);
      navigate("/");
    } else {
      navigate("/");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white">
        Connexion à la WCA...
      </p>
    </div>
  );
}