import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { entityId, formatDateTime } from '../../utils/format';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['admin', 'users', { search, role, status }],
    queryFn: () =>
      adminService.listUsers({
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      }),
  });

  const users = data?.users || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status: next }) => adminService.updateUserStatus(id, next),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="Accounts across roles" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input
          label="Search"
          placeholder="Name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: '', label: 'All roles' },
            { value: 'CUSTOMER', label: 'Customer' },
            { value: 'DRIVER', label: 'Driver' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'BLOCKED', label: 'Blocked' },
          ]}
        />
      </div>

      {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(qError)}</Alert> : null}

      {!isLoading && !users.length ? (
        <EmptyState icon={Users} title="No users match filters" />
      ) : (
        <Table
          keyField="_id"
          empty={<EmptyState icon={Users} title="No users" />}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Phone' },
            {
              key: 'role',
              header: 'Role',
              render: (row) => <Badge tone="brand">{row.role}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge
                  tone={
                    row.status === 'ACTIVE'
                      ? 'success'
                      : row.status === 'BLOCKED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {row.status}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Joined',
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.status !== 'ACTIVE' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: entityId(row), status: 'ACTIVE' })
                      }
                    >
                      Activate
                    </Button>
                  ) : null}
                  {row.status !== 'BLOCKED' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: entityId(row), status: 'BLOCKED' })
                      }
                    >
                      Block
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={users}
        />
      )}
    </div>
  );
}
