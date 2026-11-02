/** §13.4: admin tables load as eight rows. */
export function TableSkeleton() {
  return (
    <div className="table-scroll" aria-busy="true">
      <table className="table">
        <tbody>
          {Array.from({ length: 8 }, (_, row) => (
            <tr key={row}>
              <td>
                <span className="skeleton-lines" aria-hidden="true">
                  <span />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
