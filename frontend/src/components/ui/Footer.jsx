import { Link } from "react-router-dom";
import { User, Info, Coffee } from "lucide-react";

export default function Footer({ onAccount, onAbout }) {
  return (
    <footer className="w-full max-w-md mx-auto mb-4 flex flex-col items-center gap-4">

      {/* Boutons */}
      <div className="flex gap-4">

        <button
          onClick={onAccount}
          className="w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Mon compte"
        >
          <User size={22} strokeWidth={3}/>
        </button>


        <button
          onClick={onAbout}
          className="w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="À propos"
        >
          <Info size={22} strokeWidth={3}/>
        </button>

        <a
          href="https://ko-fi.com/alexrubiks"
          target="_blank"
          rel="noopener noreferrer"
          className=" w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Me soutenir"
        >
          <Coffee size={22} strokeWidth={3} />
        </a>

      </div>

      {/* Mention WCA */}
      <p className="font-body text-xs text-center text-white/70">
        La WCA n'approuve ni ne sponsorise ce projet.
      </p>

      {/* Liens */}
      <div className="flex items-center gap-2">
        <Link
          to="/privacy"
          className="font-body text-xs underline text-white/70 hover:text-white"
        >
          Politique de confidentialité
        </Link>

        <span className="text-white/40">·</span>

        <Link
          to="/legal"
          className="font-body text-xs underline text-white/70 hover:text-white"
        >
          Mentions légales
        </Link>
      </div>

      {/* Copyright */}
      <p className="font-body text-xs text-white/50 text-center">
        © 2026 Alexis Tremellat · Tous droits réservés
      </p>
    </footer>
  );
}