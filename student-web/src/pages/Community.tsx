import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListPosts } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Community() {
  const { t } = useI18n();
  const { data: postsData, isLoading: loading } = useListPosts();
  const posts = Array.isArray(postsData) ? postsData : (postsData as any)?.data ?? [];

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
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('community.title')}</h1>

        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{post.author}</h3>
                    <p className="text-sm text-gray-500">{post.date}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{post.content}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <button className="hover:text-blue-600">❤️ {post.likes} {t('community.likes')}</button>
                  <button className="hover:text-blue-600">💬 {post.comments} {t('community.comments')}</button>
                  <button className="hover:text-blue-600">↗️ {t('community.share')}</button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('community.noPosts')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
