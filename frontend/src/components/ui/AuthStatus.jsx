export default function AuthStatus({ user, onAccount }) {
  return (
    <button
      onClick={onAccount}
      className="font-body text-sm text-white/90 hover:text-white transition-colors"
    >
      {user ? (
        <>Bonjour, <span className="font-bold">{user.pseudo}</span></>
      ) : (
        "Se connecter"
      )}
    </button>
  );
}