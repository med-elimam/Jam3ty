import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import Layout from '@/components/Layout';
import { Download } from 'lucide-react';

export default function Files() {
  const { t } = useI18n();
  const { getFiles } = useApi();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      const result = await getFiles();
      if (result.success) {
        setFiles(result.files || []);
      }
      setLoading(false);
    };

    loadFiles();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('files.title')}</h1>

        {files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file: any) => (
              <Card key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{file.name}</h3>
                  <p className="text-sm text-gray-600">
                    {t('files.uploadedBy')}: {file.uploadedBy} • {file.uploadedAt}
                  </p>
                </div>
                <button className="p-2 hover:bg-blue-100 rounded-lg text-blue-600">
                  <Download size={20} />
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('files.noFiles')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
