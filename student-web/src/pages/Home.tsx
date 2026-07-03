import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi, useAuth } from '@/hooks/useApi';
import Layout from '@/components/Layout';

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { getCourses, getTimetable, getAnnouncements } = useApi();
  const [courses, setCourses] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [coursesRes, timetableRes, announcementsRes] = await Promise.all([
        getCourses(),
        getTimetable(),
        getAnnouncements(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.courses || []);
      if (timetableRes.success) setTimetable(timetableRes.timetable || []);
      if (announcementsRes.success) setAnnouncements(announcementsRes.announcements || []);
      setLoading(false);
    };

    loadData();
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
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('home.greeting')}, {user?.fullName || t('home.studentFallback')}!
          </h1>
          <p className="text-gray-600">{t('home.welcome')}</p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recent courses */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.recentCourses')}</h2>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 3).map((course: any) => (
                  <div key={course.id} className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="text-sm text-gray-600">{course.professor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('home.noCourses')}</p>
            )}
          </Card>

          {/* Upcoming sessions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.upcomingSessions')}</h2>
            {timetable.length > 0 ? (
              <div className="space-y-3">
                {timetable.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-gray-900">{session.courseName}</p>
                    <p className="text-sm text-gray-600">{session.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('home.noSessions')}</p>
            )}
          </Card>

          {/* Recent announcements */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.announcements')}</h2>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement: any) => (
                  <div key={announcement.id} className="p-3 bg-amber-50 rounded-lg">
                    <p className="font-medium text-gray-900 line-clamp-2">{announcement.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{announcement.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('announcements.noAnnouncements')}</p>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
