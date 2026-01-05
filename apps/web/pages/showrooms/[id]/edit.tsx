import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import CreateShowroomWizard from '../../../components/showroom/CreateShowroomWizard';

interface InitialShowroomData {
  name?: string;
  description?: string;
  vehicleTypes?: string[];
  vehicleCount?: string;
  city?: string;
  area?: string;
  address?: string;
  coordinates?: { lat: number; lng: number } | null;
  detailedAddress?: string;
}

const EditPublicShowroomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<InitialShowroomData | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadShowroom = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/showrooms/${id}`);
        if (!res.ok) {
          throw new Error('فشل في جلب بيانات المعرض');
        }
        const json = await res.json();
        const s = json?.data || json?.showroom || {};

        const mapped: InitialShowroomData = {
          name: s.name || '',
          description: s.description || '',
          vehicleTypes: Array.isArray(s.vehicleTypes) ? s.vehicleTypes : [],
          vehicleCount: s.vehicleCount || '',
          city: s.city || '',
          area: s.area || '',
          address: s.address || '',
          coordinates: s.coordinates || null,
          detailedAddress: s.detailedAddress || '',
        };

        setInitialData(mapped);
      } catch (e) {
        console.error(e);
        toast.error('تعذر تحميل بيانات المعرض');
      } finally {
        setLoading(false);
      }
    };

    loadShowroom();
  }, [id]);

  const handleSave = async (data: any) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/showrooms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('token')}` : '',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          vehicleTypes: data.vehicleTypes,
          vehicleCount: data.vehicleCount,
          city: data.city,
          area: data.area,
          address: data.address,
          coordinates: data.coordinates
            ? { lat: data.coordinates.lat, lng: data.coordinates.lng }
            : null,
          detailedAddress: data.detailedAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}) as any);
        throw new Error(err?.error || 'فشل في حفظ التعديلات');
      }

      toast.success('تم حفظ التعديلات بنجاح');
      router.push('/showrooms');
    } catch (e: any) {
      console.error('Save error:', e);
      toast.error(e?.message || 'تعذر حفظ التعديلات');
    }
  };

  return (
    <>
      <Head>
        <title>تعديل بيانات المعرض</title>
      </Head>

      {loading ? (
        <div className="min-h-screen bg-gray-50 py-16">
          <div className="mx-auto max-w-4xl rounded-lg bg-white p-12 text-center shadow-sm">
            <div className="mb-3 flex justify-center">
              <div
                className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                style={{ width: 24, height: 24 }}
                role="status"
                aria-label="جاري التحميل"
              />
            </div>
            <p className="text-sm text-gray-500">جاري تحميل بيانات المعرض...</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <CreateShowroomWizard
              initialData={initialData || undefined}
              title="تعديل بيانات المعرض"
              continueButtonText="حفظ التعديلات"
              onContinue={handleSave}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default EditPublicShowroomPage;
