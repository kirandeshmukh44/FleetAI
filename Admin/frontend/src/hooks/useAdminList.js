import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../services/api';

/**
 * Fetch a paginated admin list endpoint with search / filter / page state.
 *
 * `params` is merged into the query string; changing it triggers a refetch and
 * resets to page 1 (unless `keepPage` is set).
 */
const useAdminList = (path, params = {}, { keepPage = false } = {}) => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const serialized = JSON.stringify(params);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(path, {
        params: { ...JSON.parse(serialized), page, per_page: 15 },
      });
      setRows(data.items || []);
      setMeta(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load records.'));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [path, serialized, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter/search change starts again from the first page.
  useEffect(() => {
    if (!keepPage) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  return { rows, meta, loading, error, page, setPage, reload: load, setError };
};

export default useAdminList;
