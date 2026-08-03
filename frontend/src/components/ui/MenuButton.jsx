import { Link } from "react-router-dom";

function MenuButton({ to, icon, title, subtitle, color }) {
  return (
    <Link to={to} className="flex items-center w-full max-w-md hover:scale-[1.02]">
      <div className="flex items-center justify-center w-20 h-20 max-[425px]:w-16 max-[425px]:h-16 bg-white rounded-l-2xl border-8 max-[425px]:border-[6px] border-black z-10 shrink-0">
        <img src={icon} className="w-12 h-12 max-[425px]:w-9 max-[425px]:h-9 object-contain" />
      </div>
      <div
        className={`flex-1 h-20 max-[425px]:h-16 -ml-4 pl-8 max-[425px]:pl-5 pr-4 max-[425px]:pr-3 flex flex-col justify-center rounded-tr-2xl border-4 max-[425px]:border-[3px] border-black ${color} transition-transform`}
      >
        <span className="font-title font-extrabold text-lg max-[425px]:text-sm leading-tight">{title}</span>
        {subtitle && (
          <span className="font-body text-sm max-[425px]:text-xs italic font-medium">{subtitle}</span>
        )}
      </div>
    </Link>
  );
}

export default MenuButton;