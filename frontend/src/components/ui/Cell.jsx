function Cell({ cls, children }) {
  return <td className={`cell ${cls}`}>{children}</td>;
}

export default Cell;