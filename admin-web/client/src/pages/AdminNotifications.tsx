import { useState } from 'react';
import { useLocation } from 'wouter';
import { Send, Bell, User, Layers, Users } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useListAdminUniversities,
  useListAdminFaculties,
  useListAdminDepartments,
  useListAdminLevels,
  useListAdminUsers,
  useSendAdminNotification,
  getListAdminFacultiesQueryKey,
  getListAdminDepartmentsQueryKey,
  getListAdminLevelsQueryKey,
  getListAdminUsersQueryKey,
} from '@workspace/api-client-react';

type TargetType = 'all' | 'department' | 'level' | 'user';

export default function AdminNotifications() {
  const { t } = useAdminI18n();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');

  // Targeting States
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Loading CAS Data
  const { data: universitiesRes } = useListAdminUniversities();
  const { data: facultiesRes } = useListAdminFaculties(
    selectedUniversityId ? { universityId: selectedUniversityId } : undefined,
    { query: { queryKey: getListAdminFacultiesQueryKey(selectedUniversityId ? { universityId: selectedUniversityId } : undefined), enabled: !!selectedUniversityId } }
  );
  const { data: departmentsRes } = useListAdminDepartments(
    selectedFacultyId ? { facultyId: selectedFacultyId } : undefined,
    { query: { queryKey: getListAdminDepartmentsQueryKey(selectedFacultyId ? { facultyId: selectedFacultyId } : undefined), enabled: !!selectedFacultyId } }
  );
  const { data: levelsRes } = useListAdminLevels(
    selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined,
    { query: { queryKey: getListAdminLevelsQueryKey(selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined), enabled: !!selectedDepartmentId } }
  );
  const { data: usersRes } = useListAdminUsers(
    targetType === 'user' ? { role: 'student' } : undefined,
    { query: { queryKey: getListAdminUsersQueryKey(targetType === 'user' ? { role: 'student' } : undefined), enabled: targetType === 'user' } }
  );

  // Filter users based on query
  const filteredUsers = usersRes?.data?.filter((u) => {
    if (!userSearchQuery) return true;
    return (
      u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }) || [];

  const { mutate: sendNotification, isPending } = useSendAdminNotification({
    mutation: {
      onSuccess: () => {
        toast.success(t('notifications.successSend'));
        setTitle('');
        setBody('');
        setSelectedUserId('');
        setSelectedDepartmentId('');
        setSelectedLevelId('');
        setUserSearchQuery('');
      },
      onError: (err) => {
        toast.error(t('notifications.errorSend') + ': ' + err.message);
      },
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error(t('notifications.required'));
      return;
    }

    const payload: {
      title: string;
      body: string;
      userId?: string;
      departmentId?: string;
      levelId?: string;
    } = {
      title: title.trim(),
      body: body.trim(),
    };

    if (targetType === 'user' && selectedUserId) {
      payload.userId = selectedUserId;
    } else if (targetType === 'department' && selectedDepartmentId) {
      payload.departmentId = selectedDepartmentId;
    } else if (targetType === 'level' && selectedLevelId) {
      payload.levelId = selectedLevelId;
    }

    sendNotification({ data: payload });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell size={24} />
          </span>
          <h1 className="text-3xl font-bold text-foreground">{t('notifications.title')}</h1>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              {/* Target Type selector */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {t('notifications.target')}
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(['all', 'department', 'level', 'user'] as TargetType[]).map((type) => {
                    const active = targetType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setTargetType(type);
                          setSelectedUserId('');
                          setSelectedDepartmentId('');
                          setSelectedLevelId('');
                        }}
                        className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all ${
                          active
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {type === 'all' && <Users size={20} />}
                        {type === 'department' && <Layers size={20} />}
                        {type === 'level' && <Layers size={20} />}
                        {type === 'user' && <User size={20} />}
                        <span className="text-xs font-semibold">
                          {t(`notifications.target${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Targeted Selectors */}
              {targetType === 'department' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('academicStructure.university')}
                    </label>
                    <select
                      value={selectedUniversityId}
                      onChange={(e) => {
                        setSelectedUniversityId(e.target.value);
                        setSelectedFacultyId('');
                        setSelectedDepartmentId('');
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{t('academicStructure.selectUniversity')}</option>
                      {universitiesRes?.data?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('academicStructure.faculty')}
                    </label>
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => {
                        setSelectedFacultyId(e.target.value);
                        setSelectedDepartmentId('');
                      }}
                      disabled={!selectedUniversityId}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">{t('academicStructure.selectFaculty')}</option>
                      {facultiesRes?.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('notifications.department')}
                    </label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      disabled={!selectedFacultyId}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">{t('notifications.selectDepartment')}</option>
                      {departmentsRes?.data?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {targetType === 'level' && (
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('academicStructure.university')}
                    </label>
                    <select
                      value={selectedUniversityId}
                      onChange={(e) => {
                        setSelectedUniversityId(e.target.value);
                        setSelectedFacultyId('');
                        setSelectedDepartmentId('');
                        setSelectedLevelId('');
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{t('academicStructure.selectUniversity')}</option>
                      {universitiesRes?.data?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('academicStructure.faculty')}
                    </label>
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => {
                        setSelectedFacultyId(e.target.value);
                        setSelectedDepartmentId('');
                        setSelectedLevelId('');
                      }}
                      disabled={!selectedUniversityId}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">{t('academicStructure.selectFaculty')}</option>
                      {facultiesRes?.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('notifications.department')}
                    </label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => {
                        setSelectedDepartmentId(e.target.value);
                        setSelectedLevelId('');
                      }}
                      disabled={!selectedFacultyId}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">{t('notifications.selectDepartment')}</option>
                      {departmentsRes?.data?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('notifications.level')}
                    </label>
                    <select
                      value={selectedLevelId}
                      onChange={(e) => setSelectedLevelId(e.target.value)}
                      disabled={!selectedDepartmentId}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">{t('notifications.selectLevel')}</option>
                      {levelsRes?.data?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {targetType === 'user' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t('notifications.user')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('notifications.searchUser')}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>

                  {filteredUsers.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2 max-w-md">
                      {filteredUsers.map((u) => {
                        const active = selectedUserId === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setSelectedUserId(u.id)}
                            className={`flex w-full items-center justify-between rounded px-3 py-2 text-start text-sm transition-colors ${
                              active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{u.fullName}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            {active && <span className="text-xs text-primary font-semibold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {t('notifications.titleField')}
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('notifications.titleField')}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {t('notifications.bodyField')}
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('notifications.bodyField')}
                  rows={4}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isPending || (targetType === 'user' && !selectedUserId) || (targetType === 'department' && !selectedDepartmentId) || (targetType === 'level' && !selectedLevelId)}
                className="w-full sm:w-auto"
              >
                <Send className="me-2 h-4 w-4" />
                {isPending ? t('notifications.sending') : t('notifications.send')}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
}
