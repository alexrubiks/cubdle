import { Link } from "react-router-dom";

function MenuButton({ to, icon, title, subtitle, color }) {
  return (
    <Link to={to} className="flex items-center w-full max-w-md hover:scale-[1.02]">
      <div className="flex items-center justify-center w-20 h-20 bg-white rounded-l-2xl border-8 border-black z-10 shrink-0">
        <img src={icon} className="w-12 h-12 object-contain" />
      </div>
      <div
        className={`flex-1 h-20 -ml-4 pl-8 pr-4 flex flex-col justify-center rounded-tr-2xl border-4 border-black ${color} transition-transform`}
      >
        <span className="font-title font-extrabold text-lg leading-tight">{title}</span>
        {subtitle && (
          <span className="font-body text-sm italic font-medium">{subtitle}</span>
        )}
      </div>
    </Link>
  );
}

export default MenuButton;