/** Consistent page heading with an optional action cluster. */
const PageHeader = ({ title, description, actions }) => (
  <header className="admin-page-header">
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {actions ? <div className="admin-actions">{actions}</div> : null}
  </header>
);

export default PageHeader;
