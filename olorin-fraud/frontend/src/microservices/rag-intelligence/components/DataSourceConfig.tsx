import React, { useState, useCallback } from 'react';
import { Plus, Trash2, TestTube, Power, PowerOff, Database, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useRAGDataSources, DataSource, DataSourceCreate } from '../hooks/useRAGDataSources';
import { WizardPanel } from '@shared/components';

interface DataSourceConfigProps {
  className?: string;
}

const DataSourceConfig: React.FC<DataSourceConfigProps> = ({ className = "" }) => {
  const {
    dataSources,
    isLoading,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
    toggleEnabled
  } = useRAGDataSources();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DataSourceCreate>({
    name: '',
    source_type: 'postgresql',
    connection_config: {},
    enabled: true
  });

  const handleCreate = useCallback(async () => {
    const result = await createDataSource(formData);
    if (result) {
      setShowForm(false);
      setFormData({
        name: '',
        source_type: 'postgresql',
        connection_config: {},
        enabled: true
      });
    }
  }, [formData, createDataSource]);

  const handleUpdate = useCallback(async (id: string) => {
    const result = await updateDataSource(id, {
      name: formData.name,
      connection_config: formData.connection_config,
      enabled: formData.enabled
    });
    if (result) {
      setEditingId(null);
      setFormData({
        name: '',
        source_type: 'postgresql',
        connection_config: {},
        enabled: true
      });
    }
  }, [formData, updateDataSource]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete data source "${name}"?`)) {
      await deleteDataSource(id);
    }
  }, [deleteDataSource]);

  const handleTest = useCallback(async (id: string) => {
    await testConnection(id);
  }, [testConnection]);

  const handleToggleEnabled = useCallback(async (id: string, currentEnabled: boolean) => {
    await toggleEnabled(id, !currentEnabled);
  }, [toggleEnabled]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-corporate-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-corporate-error" />;
      default:
        return <AlertCircle className="w-4 h-4 text-corporate-warning" />;
    }
  };

  const renderConnectionForm = (sourceType: string) => {
    if (sourceType === 'postgresql') {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Host</label>
            <input
              type="text"
              value={formData.connection_config.host || ''}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: { ...formData.connection_config, host: e.target.value }
              })}
              className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Port</label>
            <input
              type="number"
              value={formData.connection_config.port || ''}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: { ...formData.connection_config, port: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
              placeholder="5432"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Database</label>
            <input
              type="text"
              value={formData.connection_config.database || ''}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: { ...formData.connection_config, database: e.target.value }
              })}
              className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
              placeholder="mydb"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-corporate-textSecondary mb-1">User</label>
            <input
              type="text"
              value={formData.connection_config.user || ''}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: { ...formData.connection_config, user: e.target.value }
              })}
              className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
              placeholder="postgres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Password</label>
            <input
              type="password"
              value={formData.connection_config.password || ''}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: { ...formData.connection_config, password: e.target.value }
              })}
              className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
              placeholder="password"
            />
          </div>
        </div>
      );
    } else if (sourceType === 'sqlite') {
      return (
        <div>
          <label className="block text-sm font-medium text-corporate-textSecondary mb-1">File Path</label>
          <input
            type="text"
            value={formData.connection_config.file_path || ''}
            onChange={(e) => setFormData({
              ...formData,
              connection_config: { ...formData.connection_config, file_path: e.target.value }
            })}
            className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
            placeholder="/path/to/database.db"
          />
        </div>
      );
    } else {
      return (
        <div className="text-sm text-corporate-textSecondary">
          Investigation Results data source uses the internal investigation_states table.
          No additional configuration required.
        </div>
      );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <WizardPanel
        title="Data Sources"
        isExpanded={true}
        icon={<Database className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-corporate-textSecondary">
              Configure data sources for RAG queries
            </p>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({
                  name: '',
                  source_type: 'postgresql',
                  connection_config: {},
                  enabled: true
                });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-md hover:bg-corporate-accentPrimary transition-colors border-2 border-corporate-accentPrimary/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add Data Source</span>
            </button>
          </div>

          {showForm && (
            <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg p-4">
              <h4 className="text-md font-medium text-corporate-textPrimary mb-4">
                {editingId ? 'Edit Data Source' : 'New Data Source'}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary placeholder-corporate-textTertiary focus:border-corporate-accentPrimary/60 focus:outline-none"
                    placeholder="My Data Source"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Type</label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => setFormData({
                      ...formData,
                      source_type: e.target.value as 'postgresql' | 'sqlite' | 'investigation_results',
                      connection_config: {}
                    })}
                    className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-md text-corporate-textPrimary focus:border-corporate-accentPrimary/60 focus:outline-none"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="investigation_results">Investigation Results</option>
                  </select>
                </div>
                {renderConnectionForm(formData.source_type)}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 text-corporate-accentPrimary border-corporate-borderPrimary/40 rounded bg-black/40 focus:ring-corporate-accentPrimary"
                  />
                  <label htmlFor="enabled" className="text-sm text-corporate-textSecondary">Enable immediately</label>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                    disabled={isLoading || !formData.name}
                    className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-md hover:bg-corporate-accentPrimary disabled:opacity-50 transition-colors border-2 border-corporate-accentPrimary/40"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 bg-black/40 text-corporate-textSecondary rounded-md hover:bg-black/60 transition-colors border-2 border-corporate-borderPrimary/40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            {isLoading && dataSources.length === 0 ? (
              <div className="text-center py-8 text-corporate-textTertiary">Loading data sources...</div>
            ) : dataSources.length === 0 ? (
              <div className="text-center py-8 text-corporate-textTertiary">
                No data sources configured. Click "Add Data Source" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {dataSources.map((source) => (
                  <div
                    key={source.id}
                    className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-4 hover:border-corporate-accentPrimary/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Database className="w-5 h-5 text-corporate-textSecondary" />
                        <div>
                          <div className="font-medium text-corporate-textPrimary">{source.name}</div>
                          <div className="text-sm text-corporate-textSecondary capitalize">{source.source_type}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(source.status)}
                          <span className="text-xs text-corporate-textTertiary capitalize">{source.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTest(source.id)}
                          className="p-2 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded transition-colors"
                          title="Test connection"
                        >
                          <TestTube className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleEnabled(source.id, source.enabled)}
                          className={`p-2 rounded transition-colors ${
                            source.enabled
                              ? 'text-corporate-success hover:text-corporate-success/80'
                              : 'text-corporate-textTertiary hover:text-corporate-textSecondary'
                          }`}
                          title={source.enabled ? 'Disable' : 'Enable'}
                        >
                          {source.enabled ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <PowerOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(source.id);
                            setFormData({
                              name: source.name,
                              source_type: source.source_type,
                              connection_config: source.connection_config,
                              enabled: source.enabled
                            });
                            setShowForm(true);
                          }}
                          className="p-2 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded transition-colors"
                          title="Edit"
                        >
                          <Database className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(source.id, source.name)}
                          className="p-2 text-corporate-textSecondary hover:text-corporate-error rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {source.error_message && (
                      <div className="mt-2 text-xs text-corporate-error bg-corporate-error/20 border border-corporate-error/40 p-2 rounded">
                        {source.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </WizardPanel>
    </div>
  );
};

export default DataSourceConfig;

