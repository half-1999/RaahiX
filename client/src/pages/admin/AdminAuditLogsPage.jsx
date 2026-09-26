import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { formatDateTime } from '../../utils/format';

export default function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'audit-logs', { entityType }],
    queryFn: () =>
      adminService.auditLogs({
        ...(entityType ? { entityType } : {}),
        limit: 100,
      }),
  });

  const rows = data?.items || data?.logs || [];

  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Admin mutation trail" />

      <div className="mb-4 max-w-xs">
        <Input
          label="Entity type filter"
          placeholder="e.g. Ride, Vehicle, Driver"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !rows.length ? (
        <EmptyState icon={ScrollText} title="No audit entries" />
      ) : (
        <Table
          keyField="_id"
          columns={[
            {
              key: 'createdAt',
              header: 'When',
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: 'actor',
              header: 'Actor',
              render: (row) =>
                row.actorId?.email || row.actorId?.name || row.actorRole || '—',
            },
            { key: 'action', header: 'Action' },
            { key: 'entityType', header: 'Entity' },
            {
              key: 'entityId',
              header: 'Entity ID',
              render: (row) => (
                <span className="font-mono text-xs">{row.entityId}</span>
              ),
            },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
