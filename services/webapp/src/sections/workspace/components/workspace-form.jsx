'use client';

import { z as zod } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Form, Field } from 'src/components/hook-form';

import { createWorkspace, updateWorkspace } from 'src/api/workspace';

// ----------------------------------------------------------------------

const WorkspaceSchema = zod.object({
  name: zod.string().min(1, { message: 'Name is required' }),
  allowedOrigins: zod.string().optional(),
});

// ----------------------------------------------------------------------

export function WorkspaceForm({ currentWorkspace }) {
  const router = useRouter();

  const defaultValues = {
    name: '',
    status: currentWorkspace?.status ?? 'active',
    allowedOrigins: (currentWorkspace?.allowedOrigins || []).join('\n'),
  };

  const methods = useForm({
    resolver: zodResolver(WorkspaceSchema),
    defaultValues,
    values: currentWorkspace
      ? {
          ...defaultValues,
          ...currentWorkspace,
          allowedOrigins: (currentWorkspace?.allowedOrigins || []).join('\n'),
        }
      : defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    const allowedOrigins = data.allowedOrigins
      ? data.allowedOrigins
          .split(/\r?\n|,/)
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const payload = { name: data.name, allowedOrigins };

    if (currentWorkspace?.id) {
      await updateWorkspace(currentWorkspace.id, payload);
    } else {
      await createWorkspace(payload);
    }

    router.replace(paths.dashboard.workspace.root);
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardHeader title="Workspace details" />
          <Stack spacing={3} sx={{ p: 3 }}>
            <Field.Text name="name" label="Name" placeholder="My workspace" />
            <TextField
              name="allowedOrigins"
              label="Allowed origins"
              placeholder="https://app.example.com\nhttp://localhost:3000"
              multiline
              minRows={3}
              value={methods.watch('allowedOrigins')}
              onChange={(event) => methods.setValue('allowedOrigins', event.target.value)}
              helperText="Comma or newline separated list"
            />
          </Stack>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button color="inherit" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {currentWorkspace ? 'Save changes' : 'Create workspace'}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
