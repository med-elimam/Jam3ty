import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AdminUploadField from '@/components/AdminUploadField';
import { formatUploadBytes, inferMimeTypeFromUrl } from '@/lib/admin-upload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  getListAdminFilesQueryKey,
  useCreateAdminFile,
  useDeleteAdminFile,
  useListAdminCourses,
  useListAdminFiles,
  useUpdateAdminFile,
} from '@workspace/api-client-react';
import type { AdminFile, CreateAdminFileInput } from '@workspace/api-client-react';

const FILE_TYPES = ['lecture', 'td', 'tp', 'summary', 'exam', 'correction', 'book', 'other'] as const;
const FILE_STATUSES = ['pending', 'approved', 'rejected'] as const;
const ALL = '__all__';
const NO_COURSE = '__none__';

interface FormState {
  title: string;
  fileUrl: string;
  fileType: CreateAdminFileInput['fileType'];
  mimeType: string;
  fileSize: string;
  courseId: string;
  approvalStatus: CreateAdminFileInput['approvalStatus'];
  tags: string;
  uploadedFileName: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  fileUrl: '',
  fileType: 'other',
  mimeType: 'application/pdf',
  fileSize: '0',
  courseId: NO_COURSE,
  approvalStatus: 'approved',
  tags: '',
  uploadedFileName: '',
};

const uploadCopy = {
  ar: {
    label: 'رفع الملف',
    description: 'اختر PDF او صورة او فيديو. سيتم تعبئة الرابط ونوع الملف والحجم تلقائيا.',
    choose: 'اختيار ملف',
    uploading: 'جاري الرفع',
    uploaded: 'تم الرفع',
    fallback: 'رابط يدوي متقدم',
    clear: 'مسح الملف',
    error: 'تعذر رفع الملف',
    unknownMime: 'ارفع ملفا او استخدم رابطا ينتهي بصيغة مدعومة: pdf, jpg, png, webp, mp4, webm.',
    metadata: 'بيانات الملف',
  },
  fr: {
    label: 'Fichier',
    description: 'Choisissez un PDF, une image ou une video. URL, type MIME et taille seront remplis automatiquement.',
    choose: 'Choisir un fichier',
    uploading: 'Televersement',
    uploaded: 'Televerse',
    fallback: 'URL manuelle avancee',
    clear: 'Retirer',
    error: 'Impossible de televerser le fichier',
    unknownMime: 'Televersez un fichier ou utilisez une URL finissant par: pdf, jpg, png, webp, mp4, webm.',
    metadata: 'Metadonnees du fichier',
  },
} as const;

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

function formatBytes(value: number): string {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function AdminFiles() {
  const { t, lang } = useAdminI18n();
  const c = uploadCopy[lang];
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [search, setSearch] = useState('');

  const params = {
    type: typeFilter === ALL ? undefined : (typeFilter as CreateAdminFileInput['fileType']),
    status: statusFilter === ALL ? undefined : (statusFilter as CreateAdminFileInput['approvalStatus']),
    courseId: courseFilter === ALL ? undefined : courseFilter,
    search: search.trim() || undefined,
  };

  const filesQuery = useListAdminFiles(params);
  const files = filesQuery.data?.data ?? [];
  const coursesQuery = useListAdminCourses();
  const courses = coursesQuery.data?.data ?? [];

  const createMutation = useCreateAdminFile();
  const updateMutation = useUpdateAdminFile();
  const deleteMutation = useDeleteAdminFile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminFile | null>(null);

  const saving = createMutation.isPending || updateMutation.isPending;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminFilesQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(file: AdminFile) {
    setEditing(file);
    setForm({
      title: file.title,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      mimeType: file.mimeType,
      fileSize: String(file.fileSize ?? 0),
      courseId: file.courseId ?? NO_COURSE,
      approvalStatus: file.approvalStatus,
      tags: file.tags.join(', '),
      uploadedFileName: '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    const fileUrl = form.fileUrl.trim();
    const mimeType = form.mimeType.trim();
    if (!title || !fileUrl || !mimeType) {
      toast.error(!mimeType ? c.unknownMime : t('files.required'));
      return;
    }
    const fileSize = Number(form.fileSize);
    if (!Number.isFinite(fileSize) || fileSize < 0) {
      toast.error(t('files.invalidSize'));
      return;
    }
    const payload: CreateAdminFileInput = {
      title,
      fileUrl,
      mimeType,
      fileType: form.fileType,
      fileSize: Math.trunc(fileSize),
      courseId: form.courseId === NO_COURSE ? null : form.courseId,
      approvalStatus: form.approvalStatus,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    };

    const onSuccess = () => {
      toast.success(t('files.saved'));
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(extractErrorMessage(err, t('files.saveError')));

    if (editing) {
      updateMutation.mutate({ fileId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { fileId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('files.deleted'));
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err, t('files.deleteError')));
          setDeleteTarget(null);
        },
      },
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('files.title')}</h1>
          <Button onClick={openCreate}>{t('files.create')}</Button>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('files.allTypes')}</SelectItem>
                {FILE_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`files.types.${type}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('files.allStatuses')}</SelectItem>
                {FILE_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(`files.statuses.${status}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue placeholder={t('courses.title')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('files.allCourses')}</SelectItem>
                {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {filesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : filesQuery.isError ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{t('files.loadError')}</p>
            <Button variant="outline" onClick={() => filesQuery.refetch()}>{t('common.search')}</Button>
          </Card>
        ) : files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{file.title}</h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {t(`files.types.${file.fileType}`)}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {t(`files.statuses.${file.approvalStatus}`)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {[file.courseName, file.uploaderName, file.mimeType, formatBytes(file.fileSize)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="me-2 h-4 w-4" />
                        {t('files.open')}
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(file)}>{t('common.edit')}</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(file)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center"><p className="text-muted-foreground">{t('files.empty')}</p></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('files.edit') : t('files.create')}</DialogTitle>
              <DialogDescription>{t('files.metadataOnly')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="file-title">{t('files.name')}</Label>
                <Input id="file-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} disabled={saving} />
              </div>
              <div>
                <AdminUploadField
                  label={c.label}
                  description={c.description}
                  value={{
                    url: form.fileUrl,
                    fileName: form.uploadedFileName,
                    mimeType: form.mimeType,
                    sizeBytes: Number(form.fileSize) || undefined,
                  }}
                  disabled={saving}
                  chooseLabel={c.choose}
                  uploadingLabel={c.uploading}
                  uploadedLabel={c.uploaded}
                  fallbackLabel={c.fallback}
                  clearLabel={c.clear}
                  errorLabel={c.error}
                  onUploaded={(file) => setForm((f) => ({
                    ...f,
                    fileUrl: file.url,
                    uploadedFileName: file.fileName,
                    mimeType: file.mimeType,
                    fileSize: String(file.sizeBytes),
                  }))}
                  onUrlChange={(url) => setForm((f) => ({
                    ...f,
                    fileUrl: url,
                    uploadedFileName: '',
                    mimeType: inferMimeTypeFromUrl(url),
                    fileSize: '0',
                  }))}
                  onClear={() => setForm((f) => ({ ...f, fileUrl: '', uploadedFileName: '', mimeType: '', fileSize: '0' }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('files.type')}</Label>
                  <Select value={form.fileType} onValueChange={(v) => setForm((f) => ({ ...f, fileType: v as FormState['fileType'] }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`files.types.${type}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('files.status')}</Label>
                  <Select value={form.approvalStatus} onValueChange={(v) => setForm((f) => ({ ...f, approvalStatus: v as FormState['approvalStatus'] }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILE_STATUSES.map((status) => <SelectItem key={status} value={status}>{t(`files.statuses.${status}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <Label>{c.metadata}</Label>
                <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
                  {[form.mimeType || '-', formatUploadBytes(Number(form.fileSize) || 0)].join(' · ')}
                </p>
              </div>
              <div>
                <Label>{t('files.course')}</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COURSE}>{t('files.noCourse')}</SelectItem>
                    {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file-tags">{t('files.tags')}</Label>
                <Input id="file-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} disabled={saving} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? <Spinner className="me-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('files.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.title} — {t('files.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
