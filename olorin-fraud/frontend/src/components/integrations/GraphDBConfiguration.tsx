/**
 * Graph Database Configuration Component
 * 
 * Allows tenants to configure their preferred graph database (Neo4j or TigerGraph).
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GraphDBConfig {
  graph_provider: 'neo4j' | 'tigergraph';
}

interface GraphDBConfigurationProps {
  tenantId: string;
}

export const GraphDBConfiguration: React.FC<GraphDBConfigurationProps> = ({ tenantId }) => {
  const [config, setConfig] = useState<GraphDBConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tenants/${tenantId}/graph-db-config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load graph database configuration');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Default to Neo4j if config not found
      setConfig({ graph_provider: 'neo4j' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/tenants/${tenantId}/graph-db-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save graph database configuration');
      }

      toast({
        title: 'Configuration saved',
        description: `Graph database set to ${config.graph_provider}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      toast({
        title: 'Error',
        description: 'Failed to save graph database configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Graph Database Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Graph Database Provider</label>
          <Select
            value={config?.graph_provider || 'neo4j'}
            onValueChange={(value: 'neo4j' | 'tigergraph') => {
              setConfig({ graph_provider: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select graph database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neo4j">Neo4j</SelectItem>
              <SelectItem value="tigergraph">TigerGraph</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Select the graph database provider for fraud detection features (cluster detection, shared devices, etc.)
          </p>
        </div>

        <Button onClick={saveConfig} disabled={saving || !config}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

