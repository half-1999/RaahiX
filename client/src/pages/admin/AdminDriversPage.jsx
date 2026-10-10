import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { entityId } from '../../utils/format';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  licenseNumber: '',
  verificationStatus: 'VERIFIED',
  status: 'ACTIVE',
  reason: '',
};

export default function AdminDriversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['admin', 'drivers', { search }],
    queryFn: () => adminService.listDrivers(search ? { search } : {}),
  });

  const drivers = data?.drivers || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return adminService.updateDriver(entityId(editing), {
          name: form.name,
          phone: form.phone,
          licenseNumber: form.licenseNumber,
          verificationStatus: form.verificationStatus,
          status: form.status,
          reason: form.reason,
        });
      }
      return adminService.createDriver({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        licenseNumber: form.licenseNumber,
        verificationStatus: form.verificationStatus,
        status: form.status,
      });
    },
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function openEdit(driver) {
    setEditing(driver);
    setForm({
      name: driver.name || '',
      email: driver.userId?.email || '',
      phone: driver.phone || '',
      password: '',
      licenseNumber: driver.licenseNumber || '',
      verificationStatus: driver.verificationStatus || 'PENDING',
      status: driver.status || 'ACTIVE',
    });
    setError('');
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Create and verify driver profiles"
        actions={
          <Button size="sm" onClick={openCreate}>
            Add driver
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          label="Search"
          placeholder="Name, phone, license"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(qError)}</Alert> : null}

      {!isLoading && !drivers.length ? (
        <EmptyState icon={Bus} title="No drivers yet" action={<Button onClick={openCreate}>Add driver</Button>} />
      ) : (
        <Table
          keyField="_id"
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'phone', header: 'Phone' },
            {
              key: 'email',
              header: 'Email',
              render: (row) => row.userId?.email || '—',
            },
            { key: 'licenseNumber', header: 'License' },
            {
              key: 'verificationStatus',
              header: 'Verification',
              render: (row) => (
                <Badge tone={row.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                  {row.verificationStatus}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={drivers}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit driver' : 'Add driver'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          {!editing ? (
            <>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </>
          ) : null}
          <Input
            label="License number"
            value={form.licenseNumber}
            onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
          />
          {editing ? (
            <Input
              label="Reason"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              required
            />
          ) : null}
          <Select
            label="Verification"
            value={form.verificationStatus}
            onChange={(e) => setForm((f) => ({ ...f, verificationStatus: e.target.value }))}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'VERIFIED', label: 'Verified' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
