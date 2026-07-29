import { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import Modal from './Modal';
import { API_URLS } from '../../utils';

export default function AccountModal({ onClose, user, onLogin, onLogout, onUpdatePseudo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pseudoInput, setPseudoInput] = useState(user?.pseudo || "");
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const trimmed = pseudoInput.trim();
    if (!trimmed) {
      setError("Le pseudo ne peut pas être vide.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(API_URLS.authUpdatePseudo, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pseudo: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      onUpdatePseudo(data);
      setError(null);
      setIsEditing(false);
    } catch {
      setError("Impossible de contacter le serveur.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setPseudoInput(user.pseudo);
      setIsEditing(false);
      setError(null);
    }
  };

  return (
    <Modal title="Mon compte" onClose={onClose}>
      <div className="flex flex-col gap-5">

        <div className="flex flex-col gap-2">

          {user && (
            <h3 className="font-title font-bold text-black">
              Compte WCA — <span className="font-normal">{user.wca_id}</span>
            </h3>
          )}

          {!user ? (
            <button
              onClick={onLogin}
              className="w-full py-3 bg-cubdle-yellow border-4 border-black rounded-xl font-title font-extrabold hover:opacity-90"
            >
              Se connecter avec la WCA
            </button>
          ) : (
            <div className="flex flex-col gap-3">

              <div className="bg-black/5 rounded-xl p-3 font-body text-sm">
                Connecté en tant que :
                <br />

                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      value={pseudoInput}
                      onChange={(e) => setPseudoInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={30}
                      className="flex-1 px-2 py-1 border-2 border-black rounded-lg font-bold text-sm"
                    />
                    <button
                      onClick={handleSave}
                      aria-label="Valider"
                      className="w-8 h-8 flex-shrink-0 rounded-full border-2 border-black bg-cubdle-yellow flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold">{user.pseudo}</span>
                    <button
                      onClick={() => {
                        setPseudoInput(user.pseudo);
                        setIsEditing(true);
                      }}
                      aria-label="Modifier le pseudo"
                      className="hover:opacity-70"
                    >
                      <Pencil size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {error && (
                  <p className="text-red-600 text-xs mt-1">{error}</p>
                )}
              </div>

              <button
                onClick={onLogout}
                className="w-full py-3 bg-white border-4 border-black rounded-xl font-title font-extrabold"
              >
                Se déconnecter
              </button>

            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}