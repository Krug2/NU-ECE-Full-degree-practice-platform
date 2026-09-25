import type { DataTableFigureData } from "@/lib/learning/figures";
import styles from "./data-table-figure.module.css";

export function DataTableFigure({ figure }: { figure: DataTableFigureData }) {
  return <div className={styles.figure}>
    <div className={styles.scroll} role="region" aria-label={`${figure.title}: scrollable table`} tabIndex={0}>
      <table>
        <caption>{figure.title}</caption>
        <thead><tr>{figure.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{figure.rows.map((row, index) => <tr key={index}>
          <th scope="row">{row[0]}</th>{row.slice(1).map((cell, column) => <td key={column}>{cell}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {figure.note && <p>{figure.note}</p>}
  </div>;
}
