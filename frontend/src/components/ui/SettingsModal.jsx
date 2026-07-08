import Modal from './Modal';

export default function SettingsModal({ onClose, user, onLogin, onLogout }) {
  return (
    <Modal
      title="Paramètres"
      onClose={onClose}
    >

      <div className="flex flex-col gap-5">

        {/* COMPTE */}
        <div className="flex flex-col gap-2">

          <h3 className="font-title font-bold text-black">
            Compte WCA
          </h3>

          {!user ? (

            <button
              onClick={onLogin}
              className="
                w-full
                py-3
                bg-cubdle-yellow
                border-4
                border-black
                rounded-xl
                font-title
                font-extrabold
                hover:opacity-90
              "
            >
              Se connecter avec la WCA
            </button>

          ) : (

            <div className="flex flex-col gap-3">

              <div className="
                bg-black/5
                rounded-xl
                p-3
                font-body
                text-sm
              ">
                Connecté en tant que :
                <br />
                <span className="font-bold">
                  {user.name}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="
                  w-full
                  py-3
                  bg-white
                  border-4
                  border-black
                  rounded-xl
                  font-title
                  font-extrabold
                "
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