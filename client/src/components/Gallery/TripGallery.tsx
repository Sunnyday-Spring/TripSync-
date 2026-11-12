import React, { useState, useEffect, useMemo } from 'react';
import type { Trip } from '../../types';
import {
  Compass,
  MapPin,
  Clock,
  ExternalLink,
  Maximize2,
  X,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  fetchPlacePhoto,
  getActivityDisplayImage,
  getGoogleMapsUrl,
  getDestinationCover,
} from '../../utils/imageUtils';
import { detectTripDestination } from '../../utils/geoUtils';

interface Props {
  trip: Trip;
}

export const TripGallery: React.FC<Props> = ({ trip }) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; location?: string } | null>(
    null
  );

  // Auto-fetched photos cache for activities without user-provided image
  const [dynamicPhotos, setDynamicPhotos] = useState<Record<string, string>>({});

  const activities = trip.activities || [];
  const destination = useMemo(
    () => detectTripDestination(trip.name, trip.description),
    [trip.name, trip.description]
  );
  const destinationCover = useMemo(
    () => getDestinationCover(trip.name, trip.description),
    [trip.name, trip.description]
  );

  // Automatically fetch real landmark photos from Wikipedia for activities missing imageUrl
  useEffect(() => {
    let isCancelled = false;

    activities.forEach(async (act) => {
      if (!act.imageUrl && (act.title || act.location)) {
        const photo = await fetchPlacePhoto(act.title || act.location || '');
        if (photo && !isCancelled) {
          setDynamicPhotos((prev) => ({
            ...prev,
            [act.id]: photo,
          }));
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activities]);

  // Extract distinct days from trip activities
  const daysList = useMemo(() => {
    const dates = new Set<string>();
    activities.forEach((act) => {
      const d = new Date(act.date).toISOString().split('T')[0];
      dates.add(d);
    });
    return Array.from(dates).sort();
  }, [activities]);

  // Distinct categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    activities.forEach((act) => {
      if (act.category) cats.add(act.category);
    });
    return Array.from(cats);
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const actDate = new Date(act.date).toISOString().split('T')[0];
      const matchDay = selectedDay === 'all' || actDate === selectedDay;
      const matchCat = selectedCategory === 'all' || act.category === selectedCategory;
      return matchDay && matchCat;
    });
  }, [activities, selectedDay, selectedCategory]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getDayLabel = (dateStr: string) => {
    const idx = daysList.indexOf(dateStr);
    return idx >= 0 ? `Day ${idx + 1}` : 'กิจกรรม';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Section */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-1.5 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visual Travel Board</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
              <span>แกลเลอรีภาพสถานที่ท่องเที่ยว ({filteredActivities.length} จุด)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ชมภาพสถานที่จริงของทริป "{destination.name}" พร้อมคลิกนำทางด้วย Google Maps ได้ทันที
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Compass className="w-3.5 h-3.5" />
              <span>{destination.name}</span>
            </span>
          </div>
        </div>

        {/* Filter Bar (Days & Categories) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          {/* Day Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar touch-pan-x">
            <span className="text-xs text-gray-500 font-semibold flex items-center space-x-1 mr-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>วันที่:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors border shrink-0 ${
                selectedDay === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              ทั้งหมด ({activities.length})
            </button>
            {daysList.map((dStr, idx) => (
              <button
                key={dStr}
                type="button"
                onClick={() => setSelectedDay(dStr)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors border shrink-0 ${
                  selectedDay === dStr
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                Day {idx + 1} ({formatDate(dStr)})
              </button>
            ))}
          </div>

          {/* Category Filter */}
          {categoriesList.length > 0 && (
            <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-600 min-h-[36px]"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-full h-44 rounded-xl overflow-hidden relative border border-gray-200">
            <img
              src={destinationCover}
              alt={destination.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <span className="text-white text-sm font-bold flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{destination.name}</span>
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">ยังไม่มีรูปภาพสถานที่ในหมวดนี้</h3>
            <p className="text-xs text-gray-500">
              เริ่มต้นเพิ่มกิจกรรมและสถานที่ในแท็บ Itinerary เพื่อสร้าง Visual Board ให้กับทริปของคุณ!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredActivities.map((act) => {
            const displayImg = dynamicPhotos[act.id] || getActivityDisplayImage(act);
            const actDateStr = new Date(act.date).toISOString().split('T')[0];
            const googleMapsUrl = getGoogleMapsUrl(
              act.location || act.title,
              act.latitude ?? undefined,
              act.longitude ?? undefined
            );

            return (
              <div
                key={act.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between hover:border-blue-400 transition-colors group"
              >
                {/* Photo Header */}
                <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                  <img
                    src={displayImg}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 text-gray-800 shadow-sm border border-gray-200/80 backdrop-blur-sm">
                      {act.category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white shadow-sm">
                      {getDayLabel(actDateStr)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImage({
                          url: displayImg,
                          title: act.title,
                          location: act.location || undefined,
                        })
                      }
                      className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
                      title="ดูภาพขนาดใหญ่"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Gradient shadow overlay for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-xs">
                    {act.startTime && (
                      <span className="flex items-center space-x-1 text-white/90 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-300" />
                        <span>
                          {act.startTime} {act.endTime ? `- ${act.endTime}` : ''}
                        </span>
                      </span>
                    )}

                    {act.estimatedCost > 0 && (
                      <span className="font-bold text-emerald-300">
                        ฿{act.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {act.title}
                    </h3>

                    {act.location && (
                      <div className="flex items-start space-x-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{act.location}</span>
                      </div>
                    )}

                    {act.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">{act.description}</p>
                    )}
                  </div>

                  {/* Navigation Button */}
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-blue-200 hover:border-blue-600"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>เปิดนำทางใน Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto modal-backdrop"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0 max-h-[92vh] overflow-y-auto my-auto modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-[65vh] sm:max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] sm:max-h-[70vh] w-auto max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-gray-900">{previewImage.title}</h4>
                {previewImage.location && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{previewImage.location}</span>
                  </p>
                )}
              </div>

              <a
                href={getGoogleMapsUrl(previewImage.location || previewImage.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shrink-0 shadow-xs"
              >
                <MapPin className="w-4 h-4" />
                <span>เปิดใน Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
