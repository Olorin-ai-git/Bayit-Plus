import React, { useEffect, useState } from 'react';

const DEMO_MODE = true; // Set to true for demo mode (mock data)

// Mock data for demo mode
const MOCK_INVESTIGATIONS = [
  {
    id: 'INV-001',
    policy_comments: 'Initial policy review.',
    investigator_comments: 'Looks good so far.',
    overall_risk_score: 0.2,
    entityId: 'test-user-1',
    entityType: 'user_id',
  },
  {
    id: 'INV-002',
    policy_comments: 'Other policy.',
    investigator_comments: 'Other notes.',
    overall_risk_score: 0.1,
    entityId: 'test-device-1',
    entityType: 'device_id',
  },
];

/**
 * Fetches the list of investigations from the backend or mock data.
 * @returns {Promise<any[]>} The list of investigations.
 */
const getInvestigations = async () => {
  if (DEMO_MODE) {
    return [...MOCK_INVESTIGATIONS];
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return [];
};

/**
 * Creates a new investigation (mock or real).
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @param {string} [entityId] - Entity ID for the investigation.
 * @param {string} [entityType] - Entity type ('user_id' or 'device_id').
 * @returns {Promise<any>} The created investigation.
 */
const createInvestigation = async (
  mockData?: any[],
  setMockData?: any,
  entityId?: string,
  entityType?: string,
) => {
  if (DEMO_MODE) {
    const newInv = {
      id: `INV-${Math.floor(Math.random() * 1000)}`,
      policy_comments: 'Demo created policy.',
      investigator_comments: 'Demo created investigator.',
      overall_risk_score: Math.random().toFixed(2),
      entityId: entityId || 'test-entity',
      entityType: entityType || 'user_id',
    };
    setMockData((prev: any[]) => [newInv, ...prev]);
    return newInv;
  }
  const id = `${Math.floor(Math.random() * 10000000000000000)}`;
  // Use a default entityId if not provided (for demo/test)
  const eid = entityId || 'test-entity';
  const etype = entityType || 'user_id';
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return { id, entityId: eid, entityType: etype };
};

/**
 * Edits investigations by ID (mock or real).
 * @param {string[]} ids - Investigation IDs to edit.
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @returns {Promise<boolean>} True if successful.
 */
const editInvestigations = async (
  ids: string[],
  mockData?: any[],
  setMockData?: any,
) => {
  if (DEMO_MODE) {
    setMockData((prev: any[]) =>
      prev.map((inv) =>
        ids.includes(inv.id)
          ? {
              ...inv,
              policy_comments: 'Demo edited policy.',
              investigator_comments: 'Demo edited investigator.',
              overall_risk_score: Math.random().toFixed(2),
            }
          : inv,
      ),
    );
    return true;
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return true;
};

/**
 * Deletes investigations by ID (mock or real).
 * @param {string[]} ids - Investigation IDs to delete.
 * @param {any[]} [mockData] - Mock data array.
 * @param {Function} [setMockData] - Setter for mock data.
 * @returns {Promise<any>} The response from the backend.
 */
const deleteInvestigations = async (
  ids: string[],
  mockData?: any[],
  setMockData?: any,
) => {
  if (DEMO_MODE) {
    setMockData((prev: any[]) => prev.filter((inv) => !ids.includes(inv.id)));
    return true;
  }
  // This function should be re-implemented or imported from OlorinService or another appropriate location
  return true;
};

interface InvestigationsProps {
  onCreateInvestigation?: (id: string) => void;
}

/**
 * Investigations page component for listing and managing investigations.
 * @param {InvestigationsProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const Investigations: React.FC<InvestigationsProps> = ({
  onCreateInvestigation,
}) => {
  const [investigations, setInvestigations] = useState<any[]>(
    DEMO_MODE ? MOCK_INVESTIGATIONS : [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches investigations and updates state.
   */
  const fetchInvestigations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        setInvestigations([...MOCK_INVESTIGATIONS]);
      } else {
        const data = await getInvestigations();
        setInvestigations(data);
      }
      setSelected([]);
    } catch (err: any) {
      setError('fetch error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  /**
   * Handles select all checkbox.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(investigations.map((inv) => inv.id));
    } else {
      setSelected([]);
    }
  };

  /**
   * Handles selection of a single investigation.
   * @param {string} id - The investigation ID.
   */
  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /**
   * Handles creation of a new investigation.
   */
  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      let newId = `INV-${Math.floor(Math.random() * 10000000000000000)}`;
      if (DEMO_MODE) {
        const newInv = await createInvestigation(
          investigations,
          setInvestigations,
        );
        newId = newInv.id;
        if (onCreateInvestigation) {
          onCreateInvestigation(newId);
        }
      } else {
        // Use a default entityId for now; replace with actual entityId if available
        const entityId = 'test-entity';
        const entityType = 'user_id';
        const newInv = await createInvestigation(
          undefined,
          undefined,
          entityId,
          entityType,
        );
        setInvestigations((prev) => [newInv, ...prev]);
        newId = newInv.id;
        if (onCreateInvestigation) {
          onCreateInvestigation(newId);
        }
      }
    } catch (err: any) {
      setError('create error');
    }
    setLoading(false);
  };

  /**
   * Handles editing selected investigations.
   */
  const handleEdit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        await editInvestigations(selected, investigations, setInvestigations);
      } else {
        await editInvestigations(selected);
        await fetchInvestigations();
      }
    } catch (err: any) {
      setError('edit error');
    }
    setLoading(false);
  };

  /**
   * Handles deletion of selected investigations.
   */
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        await deleteInvestigations(selected, investigations, setInvestigations);
      } else {
        await deleteInvestigations(selected);
        setInvestigations((prev) =>
          prev.filter((inv) => !selected.includes(inv.id)),
        );
      }
      setSelected([]);
    } catch (err: any) {
      setError('delete error');
    }
    setLoading(false);
  };

  const handleRefresh = fetchInvestigations;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Investigations</h1>
      <div className="flex space-x-2 mb-6">
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Create
        </button>
        <button
          type="button"
          onClick={handleEdit}
          disabled={loading || selected.length === 0}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || selected.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <input
                  type="checkbox"
                  checked={selected.length === investigations.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Entity ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Entity Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Policy Comments
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Investigator Comments
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Risk Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {investigations.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selected.includes(inv.id)}
                    onChange={() => handleSelect(inv.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {inv.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inv.entityId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inv.entityType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inv.policy_comments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inv.investigator_comments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inv.overall_risk_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Investigations;
