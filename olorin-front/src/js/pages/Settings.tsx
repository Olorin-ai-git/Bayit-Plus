import React, { ChangeEvent } from 'react';
import { allPossibleSteps } from '../utils/investigationStepsConfig';
import { useSettings } from '../hooks/useSettings';

/** Settings page for default investigation preferences */
const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useSettings();
  const {
    defaultEntityType,
    selectedAgents,
    commentPrefix,
    agentToolsMapping,
  } = settings;
  const agents = allPossibleSteps.map((s) => s.agent);

  const handleEntityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSettings((prev) => ({
      ...prev,
      defaultEntityType: e.target.value as any,
    }));
  };

  const toggleAgent = (agent: string) => {
    setSettings((prev) => {
      const nextAgents = prev.selectedAgents.includes(agent)
        ? prev.selectedAgents.filter((a) => a !== agent)
        : [...prev.selectedAgents, agent];
      return { ...prev, selectedAgents: nextAgents };
    });
  };

  const handlePrefixChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, commentPrefix: e.target.value }));
  };

  const toggleTool = (agent: string, tool: string) => {
    setSettings((prev) => {
      const prevTools = prev.agentToolsMapping[agent] || [];
      const nextTools = prevTools.includes(tool)
        ? prevTools.filter((t) => t !== tool)
        : [...prevTools, tool];
      return {
        ...prev,
        agentToolsMapping: { ...prev.agentToolsMapping, [agent]: nextTools },
      };
    });
  };

  return (
    <div className="p-6 flex-1 overflow-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <div className="mb-6">
        <label className="block font-medium mb-1">Default Entity Type</label>
        <select
          className="border rounded px-2 py-1 w-48"
          value={defaultEntityType}
          onChange={handleEntityChange}
        >
          <option value="auth_id">Authorization ID</option>
          <option value="device_id">Device ID</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-1">Default Agents</label>
        <div className="grid grid-cols-2 gap-2">
          {agents.map((agent) => (
            <label key={agent} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedAgents.includes(agent)}
                onChange={() => toggleAgent(agent)}
              />
              {agent}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-1">Comment Prefix</label>
        <textarea
          className="border rounded p-2 w-full"
          rows={3}
          value={commentPrefix}
          onChange={handlePrefixChange}
        />
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-1">Tools per Agent</label>
        <div className="space-y-4">
          {selectedAgents.map((agent) => (
            <fieldset key={agent} className="border rounded p-3">
              <legend className="font-semibold">{agent}</legend>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Splunk', 'OII', 'CHRONOS', 'NELI', 'DI BB', 'DATA LAKE'].map(
                  (tool) => (
                    <label key={tool} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={
                          agentToolsMapping[agent]?.includes(tool) || false
                        }
                        onChange={() => toggleTool(agent, tool)}
                      />
                      {tool}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
