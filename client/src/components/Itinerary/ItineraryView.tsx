import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Activity, Trip } from '../../types';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Plus, Coffee, Utensils, Landmark, Mountain, ShoppingBag, Hotel, Car, Compass, Clock, MapPin, Trash2, DollarSign, GripVertical, Pencil, X, Image as ImageIcon, Upload, Maximize2, Sparkles, Search, ChevronDown, ChevronUp, ChevronsUpDown, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { detectTripDestination, geocodeLocation } from '../../utils/geoUtils';
import { fetchPlacePhoto } from '../../utils/imageUtils';

interface Props {
  trip: Trip;
  onRefresh: () => void;
}

const CATEGORIES = [
  { name: 'Cafe', icon: Coffee, emoji: '☕', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { name: 'Food', icon: Utensils, emoji: '🍜', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { name: 'Culture', icon: Landmark, emoji: '🏯', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { name: 'Nature', icon: Mountain, emoji: '🌄', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { name: 'Shopping', icon: ShoppingBag, emoji: '🛍️', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { name: 'Hotel', icon: Hotel, emoji: '🏨', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { name: 'Transport', icon: Car, emoji: '🚗', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { name: 'Activity', icon: Compass, emoji: '🎯', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export const ItineraryView: React.FC<Props> = ({ trip, onRefresh }) => {
  const { socket } = useSocket();
  const tripDestination = React.useMemo(() => {
    return detectTripDestination(trip.name, trip.description);
  }, [trip.name, trip.description]);

  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Optimistic local activities state — prevents drag visual jump on onRefresh()
  const [localActivities, setLocalActivities] = useState<Activity[]>(trip.activities || []);
  const isDragPending = React.useRef(false);

  // Sub-toolbar states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Sync with parent trip data whenever it changes (but not while drag in flight)
  React.useEffect(() => {
    if (!isDragPending.current) {
      setLocalActivities(trip.activities || []);
    }
  }, [trip.activities]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [category, setCategory] = useState('Activity');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live Location Search State (OpenStreetMap Nominatim API)
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchTimeoutRef = React.useRef<any>(null);

  // Helper to extract clean place title and descriptive address
  const getPlaceInfo = (res: any) => {
    const namedetails = res.namedetails || {};
    const address = res.address || {};
    const parts = (res.display_name || '').split(',').map((s: string) => s.trim());

    // 1. Get primary name
    let primaryName = namedetails['name:th'] || namedetails['name'] || res.name || '';

    // 2. If name is generic or missing (e.g., "น้ำตก", "วัด"), inspect address features
    const genericWords = ['น้ำตก', 'วัด', 'คาเฟ่', 'ร้านอาหาร', 'โรงแรม', 'Park', 'Beach'];
    if (!primaryName || genericWords.includes(primaryName)) {
      const specificFeature = address.waterway || address.tourism || address.amenity || address.leisure || address.historic || address.attraction || address.shop;
      if (specificFeature && specificFeature !== primaryName) {
        primaryName = specificFeature;
      }
    }

    // 3. Fallback to searching non-generic tokens in display_name
    if (!primaryName || genericWords.includes(primaryName)) {
      for (const p of parts) {
        if (p && !genericWords.includes(p) && !['ประเทศไทย', 'Thailand'].includes(p)) {
          primaryName = p;
          break;
        }
      }
    }

    if (!primaryName) primaryName = parts[0] || 'สถานที่ท่องเที่ยว';

    // Subtitle address (excluding primary name for clarity)
    const subParts = parts.filter((p: string) => p !== primaryName && p !== 'ประเทศไทย');
    const subAddress = subParts.slice(0, 4).join(', ');

    return {
      title: primaryName,
      fullAddress: res.display_name,
      subAddress: subAddress || res.display_name,
      lat: res.lat,
      lon: res.lon,
    };
  };

  const handleSearchLocation = (query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchingLocation(false);
      return;
    }
    setSearchingLocation(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&accept-language=th,en&addressdetails=1&namedetails=1&countrycodes=th`
        );
        let data = await res.json();

        // If no results and query does not already include destination name, try with destination
        if ((!data || data.length === 0) && tripDestination.name && !query.includes(tripDestination.name)) {
          const retryRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${query} ${tripDestination.name}`)}&limit=8&accept-language=th,en&addressdetails=1&namedetails=1&countrycodes=th`
          );
          data = await retryRes.json();
        }

        const parsed = (data || []).map((item: any) => ({
          raw: item,
          info: getPlaceInfo(item),
        }));
        setSearchResults(parsed);
      } catch (err) {
        console.error('Failed to search location:', err);
      } finally {
        setSearchingLocation(false);
      }
    }, 400);
  };

  const handleAutoFetchPhoto = async (targetQuery?: string) => {
    const query = (targetQuery || title || locationSearchQuery || location || '').trim();
    if (!query) {
      toast.error('กรุณาระบุชื่อสถานที่หรือกิจกรรมก่อนค้นหารูปภาพ');
      return;
    }

    setFetchingPhoto(true);
    const toastId = toast.loading(`กำลังค้นหารูปภาพของ "${query}"...`);
    try {
      const foundUrl = await fetchPlacePhoto(query);
      if (foundUrl) {
        setImageUrl(foundUrl);
        toast.success(`พบรูปภาพสำหรับ "${query}" เรียบร้อยแล้ว!`, { id: toastId });
      } else {
        toast.error(`ไม่พบรูปภาพสำหรับ "${query}" ในวิกิพีเดีย สามารถอัปโหลดรูปเองได้ครับ`, { id: toastId });
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการดึงรูปภาพ', { id: toastId });
    } finally {
      setFetchingPhoto(false);
    }
  };

  const handleSelectSearchResult = (parsedItem: any) => {
    const { info } = parsedItem;
    if (!title) setTitle(info.title);
    setLocation(`${info.title}${info.subAddress ? `, ${info.subAddress}` : ''}`);
    setLatitude(info.lat);
    setLongitude(info.lon);
    setLocationSearchQuery(info.title);
    setSearchResults([]);
    toast.success(`เลือกสถานที่: ${info.title}`);

    // If no custom image set yet, auto-fetch high quality image from place name
    if (!imageUrl) {
      handleAutoFetchPhoto(info.title);
    }
  };

  // Generate list of dates between startDate and endDate
  const getDaysArray = () => {
    const days: { dateStr: string; label: string; dateObj: Date }[] = [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    let curr = new Date(start);
    let dayNum = 1;

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const label = `Day ${dayNum} — ${curr.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
      days.push({ dateStr, label, dateObj: new Date(curr) });
      curr.setDate(curr.getDate() + 1);
      dayNum++;
    }
    return days;
  };

  const days = getDaysArray();

  const toggleDayCollapse = (dateStr: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const isAllCollapsed = days.length > 0 && days.every((d) => collapsedDays[d.dateStr]);

  const toggleAllDays = () => {
    if (isAllCollapsed) {
      setCollapsedDays({});
    } else {
      const newMap: Record<string, boolean> = {};
      days.forEach((d) => {
        newMap[d.dateStr] = true;
      });
      setCollapsedDays(newMap);
    }
  };

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: localActivities.length };
    localActivities.forEach((act) => {
      counts[act.category] = (counts[act.category] || 0) + 1;
    });
    return counts;
  }, [localActivities]);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป (กรุณาเลือกไฟล์ไม่เกิน 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 1200px to maintain high resolution while keeping payload lightweight
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(compressed);
        toast.success('อัปโหลดรูปภาพสำเร็จ!');
      };
      img.onerror = () => {
        toast.error('ไม่สามารถประมวลผลรูปภาพได้');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      toast.error('กรุณาระบุชื่อกิจกรรมและวันที่');
      return;
    }
    setSubmitting(true);
    try {
      let finalLat = latitude ? parseFloat(latitude) : null;
      let finalLng = longitude ? parseFloat(longitude) : null;

      // Auto-geocode if coordinates not supplied
      if ((!finalLat || !finalLng) && (location || title)) {
        try {
          const targetQuery = location ? `${location}, ${title}` : title;
          const geo = await geocodeLocation(targetQuery, tripDestination.name);
          if (geo) {
            finalLat = geo.lat;
            finalLng = geo.lng;
          }
        } catch (err) {
          console.warn('Auto geocode failed:', err);
        }
      }

      if (editingActivity) {
        const payload = {
          title,
          description,
          imageUrl: imageUrl || null,
          date,
          startTime,
          endTime,
          location,
          latitude: finalLat,
          longitude: finalLng,
          category,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        };

        const res = await api.put(`/activities/${editingActivity.id}`, payload);

        // Optimistically update local activities state immediately
        const updatedAct: Activity = res.data?.activity || {
          ...editingActivity,
          ...payload,
          date: new Date(date).toISOString(),
          latitude: payload.latitude ?? undefined,
          longitude: payload.longitude ?? undefined,
        };

        setLocalActivities((prev) =>
          prev.map((act) => (act.id === editingActivity.id ? updatedAct : act))
        );

        toast.success('แก้ไขกิจกรรมสำเร็จ!');
        setShowModal(false);
        setEditingActivity(null);
        resetForm();
        onRefresh();

        if (socket) {
          socket.emit('activity-changed', { tripId: trip.id, action: 'update', data: updatedAct });
        }
      } else {
        await api.post('/activities', {
          tripId: trip.id,
          title,
          description,
          imageUrl: imageUrl || null,
          date,
          startTime,
          endTime,
          location,
          latitude: finalLat,
          longitude: finalLng,
          category,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        });

        toast.success('เพิ่มกิจกรรมสำเร็จ!');
        setShowModal(false);
        resetForm();
        onRefresh();

        if (socket) {
          socket.emit('activity-changed', { tripId: trip.id, action: 'create' });
        }
      }
    } catch (err: any) {
      console.error('Save activity error:', err);
      toast.error(err.response?.data?.message || (editingActivity ? 'แก้ไขกิจกรรมไม่สำเร็จ' : 'เพิ่มกิจกรรมไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (act: Activity) => {
    setEditingActivity(act);
    setTitle(act.title || '');
    setDescription(act.description || '');
    setImageUrl(act.imageUrl || '');
    const actDateStr = new Date(act.date).toISOString().split('T')[0];
    setDate(actDateStr);
    setStartTime(act.startTime || '09:00');
    setEndTime(act.endTime || '10:00');
    setLocation(act.location || '');
    setLatitude(act.latitude !== undefined && act.latitude !== null ? String(act.latitude) : '');
    setLongitude(act.longitude !== undefined && act.longitude !== null ? String(act.longitude) : '');
    setCategory(act.category || 'Activity');
    setEstimatedCost(act.estimatedCost !== undefined && act.estimatedCost !== null ? String(act.estimatedCost) : '0');
    setLocationSearchQuery(act.location || '');
    setSearchResults([]);
    setShowModal(true);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('คุณต้องการลบกิจกรรมนี้ใช่หรือไม่?')) return;
    try {
      await api.delete(`/activities/${activityId}`);
      toast.success('ลบกิจกรรมสำเร็จ');
      onRefresh();

      if (socket) {
        socket.emit('activity-changed', { tripId: trip.id, action: 'delete' });
      }
    } catch (err) {
      toast.error('ไม่สามารถลบกิจกรรมได้');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setLocation('');
    setLatitude('');
    setLongitude('');
    setCategory('Activity');
    setEstimatedCost('0');
    setImageUrl('');
    setLocationSearchQuery('');
    setSearchResults([]);
  };

  const openAddModalForDay = (dateStr: string) => {
    setEditingActivity(null);
    resetForm();
    setDate(dateStr);
    setShowModal(true);
  };

  const getCategoryMeta = (catName: string) => {
    return CATEGORIES.find((c) => c.name === catName) || CATEGORIES[7];
  };

  // Group activities by date (using local optimistic state)
  const activitiesByDate: { [dateStr: string]: Activity[] } = {};
  days.forEach((d) => {
    activitiesByDate[d.dateStr] = [];
  });

  localActivities.forEach((act) => {
    const actDateStr = new Date(act.date).toISOString().split('T')[0];
    if (activitiesByDate[actDateStr]) {
      activitiesByDate[actDateStr].push(act);
    } else {
      activitiesByDate[actDateStr] = [act];
    }
  });

  // Ensure activities are always sorted by order for smooth reordering and drop animations
  Object.keys(activitiesByDate).forEach((dateKey) => {
    activitiesByDate[dateKey].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  // Calculate cost summaries
  const dayCosts: { [dateStr: string]: number } = {};
  let totalTripEstimatedCost = 0;
  days.forEach((d) => {
    const dayTotal = (activitiesByDate[d.dateStr] || []).reduce(
      (sum, act) => sum + (act.estimatedCost || 0),
      0
    );
    dayCosts[d.dateStr] = dayTotal;
    totalTripEstimatedCost += dayTotal;
  });

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const sourceDateStr = source.droppableId;
    const destDateStr = destination.droppableId;

    const sourceList = Array.from(activitiesByDate[sourceDateStr] || []);
    const destList = sourceDateStr === destDateStr ? sourceList : Array.from(activitiesByDate[destDateStr] || []);

    const [moved] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, moved);

    // Reassign order
    const updatedActivitiesPayload: { id: string; order: number; date: string }[] = [];

    destList.forEach((act, idx) => {
      updatedActivitiesPayload.push({
        id: act.id,
        order: idx,
        date: destDateStr,
      });
    });

    if (sourceDateStr !== destDateStr) {
      sourceList.forEach((act, idx) => {
        updatedActivitiesPayload.push({
          id: act.id,
          order: idx,
          date: sourceDateStr,
        });
      });
    }

    // ── Optimistic update (prevents visual jump on parent onRefresh) ──
    isDragPending.current = true;
    const updateMap = new Map(updatedActivitiesPayload.map((u) => [u.id, u]));
    const optimistic = localActivities.map((act) => {
      const u = updateMap.get(act.id);
      if (u) {
        return {
          ...act,
          order: u.order,
          date: new Date(u.date).toISOString(),
        };
      }
      return act;
    });
    setLocalActivities(optimistic);

    try {
      await api.put('/activities/reorder', {
        tripId: trip.id,
        activities: updatedActivitiesPayload,
      });
      onRefresh(); // background sync — won't jitter because isDragPending guard is released after

      if (socket) {
        socket.emit('activity-changed', { tripId: trip.id, action: 'reorder' });
      }
    } catch (err) {
      // Revert optimistic update on failure
      setLocalActivities(trip.activities || []);
      toast.error('ไม่สามารถอัปเดตลำดับกิจกรรมได้');
    } finally {
      isDragPending.current = false;
    }
  };

  const handleDeleteDay = async (day: { dateStr: string; label: string }, dayIndex: number) => {
    if (days.length <= 1) {
      toast.error('ทริปต้องมีอย่างน้อย 1 วัน ไม่สามารถลบได้');
      return;
    }

    const dayActs = activitiesByDate[day.dateStr] || [];
    const confirmMessage = dayActs.length > 0
      ? `คุณต้องการลบ ${day.label} พร้อมกิจกรรมทั้งหมด ${dayActs.length} รายการในวันนี้ใช่หรือไม่?`
      : `คุณต้องการลบ ${day.label} ใช่หรือไม่?`;

    if (!confirm(confirmMessage)) return;

    try {
      await api.post(`/trips/${trip.id}/delete-day`, {
        dateStr: day.dateStr,
        dayIndex,
      });

      toast.success(`ลบ ${day.label} สำเร็จ`);
      onRefresh();

      if (socket) {
        socket.emit('activity-changed', { tripId: trip.id, action: 'delete-day' });
      }
    } catch (err: any) {
      console.error('Delete day error:', err);
      toast.error(err.response?.data?.message || 'ไม่สามารถลบวันเดินทางได้');
    }
  };

  const handleAddDay = async () => {
    try {
      await api.post(`/trips/${trip.id}/add-day`);
      toast.success(`เพิ่มวันเดินทาง (Day ${days.length + 1}) สำเร็จ`);
      onRefresh();

      if (socket) {
        socket.emit('activity-changed', { tripId: trip.id, action: 'add-day' });
      }
    } catch (err: any) {
      console.error('Add day error:', err);
      toast.error(err.response?.data?.message || 'ไม่สามารถเพิ่มวันเดินทางได้');
    }
  };

  return (
    <div className="space-y-6">
      {/* Trip Cost Summary Banner */}
      {totalTripEstimatedCost > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ค่าใช้จ่ายโดยประมาณทั้งทริป</p>
                <p className="text-2xl font-bold text-green-600">฿{totalTripEstimatedCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                dayCosts[day.dateStr] > 0 && (
                  <span key={day.dateStr} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700">
                    {day.label.split('—')[0].trim()}: <span className="text-green-600 ml-1">฿{dayCosts[day.dateStr].toLocaleString()}</span>
                  </span>
                )
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Itinerary Context Sub-Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search activity input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหากิจกรรมหรือสถานที่ในทริป..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick controls: Collapse/Expand All & Add Day */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={toggleAllDays}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center space-x-1.5"
              title={isAllCollapsed ? 'ขยายทุกวัน' : 'ย่อทุกวัน'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span>{isAllCollapsed ? 'ขยายทุกวัน' : 'ย่อทุกวัน'}</span>
            </button>

            <button
              onClick={handleAddDay}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center space-x-1.5"
              title="เพิ่มวันเดินทางต่อท้าย"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>+ เพิ่มวัน</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`min-h-[32px] px-3 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedCategoryFilter === 'ALL' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {categoryCounts.ALL || 0}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.name] || 0;
            const isSelected = selectedCategoryFilter === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat.name)}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? `${cat.color} ring-2 ring-blue-400 font-bold`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-black/10' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-5">
          {days.map((day, index) => {
            const isDayCollapsed = Boolean(collapsedDays[day.dateStr]);
            const rawDayActs = activitiesByDate[day.dateStr] || [];
            const dayActs = rawDayActs.filter((act) => {
              const matchesCat = selectedCategoryFilter === 'ALL' || act.category === selectedCategoryFilter;
              const matchesSearch =
                !searchQuery ||
                act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (act.location && act.location.toLowerCase().includes(searchQuery.toLowerCase()));
              return matchesCat && matchesSearch;
            });

            return (
              <div key={day.dateStr} className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleDayCollapse(day.dateStr)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title={isDayCollapsed ? 'ขยายกิจกรรมวันนี้' : 'ย่อกิจกรรมวันนี้'}
                    >
                      {isDayCollapsed ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span>{day.label}</span>
                    </h3>
                    <span className="text-xs text-gray-400 font-normal">
                      ({rawDayActs.length} กิจกรรม)
                    </span>
                    {dayCosts[day.dateStr] > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200 ml-1">
                        <DollarSign className="w-3 h-3 mr-0.5" />
                        ฿{dayCosts[day.dateStr].toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openAddModalForDay(day.dateStr)}
                      className="min-h-[40px] flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มกิจกรรม</span>
                    </button>
                    {days.length > 1 && (
                      <button
                        onClick={() => handleDeleteDay(day, index)}
                        className="min-h-[40px] flex items-center space-x-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200 transition-colors"
                        title={`ลบ ${day.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบวัน</span>
                      </button>
                    )}
                  </div>
                </div>

                {isDayCollapsed ? (
                  <div
                    onClick={() => toggleDayCollapse(day.dateStr)}
                    className="text-xs text-gray-500 py-2.5 px-3.5 bg-gray-50/80 hover:bg-gray-100 rounded-xl cursor-pointer flex items-center justify-between transition-colors border border-dashed border-gray-200"
                  >
                    <span>ซ่อนรายละเอียดอยู่ ({rawDayActs.length} กิจกรรม • ฿{(dayCosts[day.dateStr] || 0).toLocaleString()})</span>
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <span>ขยาย</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ) : (
                  <Droppable droppableId={day.dateStr}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[60px] rounded-xl flex flex-col gap-2.5 transition-colors duration-150 droppable-highlight ${
                          snapshot.isDraggingOver
                            ? 'bg-blue-50/50 ring-1 ring-blue-300'
                            : ''
                        }`}
                      >
                        {dayActs.length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl font-normal">
                            {selectedCategoryFilter !== 'ALL' || searchQuery
                              ? 'ไม่มีกิจกรรมที่ตรงกับตัวกรองหรือการค้นหา'
                              : 'ยังไม่มีกิจกรรมในวันนี้ กด "+ เพิ่มกิจกรรม" เพื่อเริ่มต้น'}
                          </div>
                        ) : (
                        dayActs.map((act, index) => {
                          const catMeta = getCategoryMeta(act.category);
                          const IconComp = catMeta.icon;

                          return (
                            <Draggable key={act.id} draggableId={act.id} index={index}>
                              {(provided, snapshot) => {
                                const cardNode = (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={provided.draggableProps.style}
                                    className={`bg-white p-3.5 sm:p-4 rounded-xl border transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 draggable-item select-none ${
                                      snapshot.isDragging
                                        ? 'border-blue-500 ring-2 ring-blue-500 bg-white z-[9999]'
                                        : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="min-h-[44px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 transition-colors shrink-0 self-center touch-none"
                                        title="ลากเพื่อเปลี่ยนลำดับกิจกรรม"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>

                                      {act.imageUrl ? (
                                        <div
                                          onClick={() => setPreviewImage(act.imageUrl!)}
                                          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer group bg-gray-100 self-center sm:self-start"
                                          title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                                        >
                                          <img
                                            src={act.imageUrl}
                                            alt={act.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`p-2 rounded-lg border ${catMeta.color} shrink-0 self-center sm:self-start`}>
                                          <IconComp className="w-4 h-4" />
                                        </div>
                                      )}

                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-2 flex-wrap">
                                          <h4
                                            onClick={() => handleOpenEditModal(act)}
                                            className="font-semibold text-gray-900 text-sm sm:text-base hover:text-blue-600 cursor-pointer transition-colors"
                                            title="คลิกเพื่อแก้ไขกิจกรรม"
                                          >
                                            {act.title}
                                          </h4>
                                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catMeta.color}`}>
                                            {catMeta.emoji} {catMeta.name}
                                          </span>
                                        </div>

                                        {act.description && (
                                          <p className="text-xs text-gray-500 font-normal">{act.description}</p>
                                        )}

                                        <div className="flex items-center space-x-4 text-xs text-gray-500 pt-0.5 flex-wrap gap-y-1">
                                          {(act.startTime || act.endTime) && (
                                            <div className="flex items-center space-x-1 text-gray-600">
                                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                                              <span>
                                                {act.startTime || '00:00'} - {act.endTime || '00:00'}
                                              </span>
                                            </div>
                                          )}

                                          {act.location && (
                                            <div className="flex items-center space-x-1 text-gray-600">
                                              <MapPin className="w-3.5 h-3.5 text-red-500" />
                                              <span>{act.location}</span>
                                            </div>
                                          )}

                                          {act.estimatedCost > 0 && (
                                            <div className="flex items-center space-x-1 text-green-600 font-semibold">
                                              <DollarSign className="w-3.5 h-3.5" />
                                              <span>฿{act.estimatedCost.toLocaleString()}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 self-end sm:self-center shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(act)}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="แก้ไขกิจกรรม"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteActivity(act.id)}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="ลบกิจกรรม"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );

                                if (snapshot.isDragging) {
                                  return createPortal(cardNode, document.body);
                                }
                                return cardNode;
                              }}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                )}
              </div>
            );
          })}

          <div className="flex justify-center pt-1">
            <button
              onClick={handleAddDay}
              className="min-h-[44px] flex items-center space-x-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-300 hover:border-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มวันเดินทาง (Day {days.length + 1})</span>
            </button>
          </div>
        </div>
      </DragDropContext>

      {/* Add / Edit Activity Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white text-gray-900 w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto modal-content">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                {editingActivity ? (
                  <>
                    <Pencil className="w-5 h-5 text-blue-600" />
                    <span>แก้ไขกิจกรรม</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    <span>เพิ่มกิจกรรมในแผนการเดินทาง</span>
                  </>
                )}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingActivity(null);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อกิจกรรม / สถานที่ *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น Doi Suthep, Cafe Roaster, Wat Chedi Luang"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">วันเดินทาง *</label>
                  <select
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  >
                    {days.map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.label}
                      </option>
                    ))}
                    {!days.some((d) => d.dateStr === date) && date && (
                      <option value={date}>{date}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เวลาเริ่มต้น</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ค่าใช้จ่ายโดยประมาณ (฿)</label>
                <input
                  type="number"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span>ค้นหาสถานที่จริง (OpenStreetMap Search)</span>
                  <span className="text-[10px] text-indigo-600 font-bold">⚡ ค้นหาฟรีจากฐานข้อมูลแผนที่จริง</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => {
                      setLocationSearchQuery(e.target.value);
                      handleSearchLocation(e.target.value);
                    }}
                    placeholder={
                      tripDestination.name.includes('กรุงเทพ')
                        ? 'พิมพ์ชื่อสถานที่ เช่น สยามพารากอน, วัดพระแก้ว, เยาวราช, ICONSIAM...'
                        : tripDestination.name.includes('เชียงใหม่')
                        ? 'พิมพ์ชื่อสถานที่ เช่น วัดพระธาตุดอยสุเทพ, ถนนนิมมาน, ประตูท่าแพ...'
                        : tripDestination.name.includes('ภูเก็ต')
                        ? 'พิมพ์ชื่อสถานที่ เช่น แหลมพรหมเทพ, หาดป่าตอง, เมืองเก่าภูเก็ต...'
                        : `พิมพ์ชื่อสถานที่ใน ${tripDestination.name}...`
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none pr-8 font-medium"
                  />
                  {searchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  {/* Dropdown Suggestions */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map((item: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left p-2.5 hover:bg-indigo-50 text-xs transition-colors flex items-start space-x-2.5"
                        >
                          <MapPin className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 text-xs flex items-center space-x-1">
                              <span>{item.info.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{item.info.subAddress}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">สถานที่ / ที่อยู่</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={`เช่น สถานที่หรือย่านใน ${tripDestination.name}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ละติจูด (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="เช่น 18.7883"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ลองจิจูด (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="เช่น 98.9853"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Image Upload / URL Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>รูปภาพประกอบสถานที่</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={fetchingPhoto || (!title.trim() && !location.trim() && !locationSearchQuery.trim())}
                      onClick={() => handleAutoFetchPhoto()}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors min-h-[36px]"
                      title="ค้นหารูปภาพอัตโนมัติจากชื่อสถานที่ในวิกิพีเดีย"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${fetchingPhoto ? 'animate-spin' : ''}`} />
                      <span>{fetchingPhoto ? 'กำลังค้นหา...' : 'ดึงรูปอัตโนมัติ'}</span>
                    </button>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium px-1 py-1"
                      >
                        ลบรูปภาพ
                      </button>
                    )}
                  </div>
                </div>

                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group h-36 sm:h-44">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleAutoFetchPhoto()}
                        disabled={fetchingPhoto}
                        className="px-2.5 py-1.5 bg-black/65 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs transition-colors shadow-xs text-xs font-medium flex items-center space-x-1 min-h-[36px]"
                        title="ค้นหารูปภาพใหม่จากชื่อสถานที่"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${fetchingPhoto ? 'animate-spin' : ''}`} />
                        <span>เปลี่ยนรูปอัตโนมัติ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-2 bg-black/65 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs transition-colors shadow-xs min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="ลบรูปภาพนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAutoFetchPhoto()}
                        disabled={fetchingPhoto || (!title.trim() && !location.trim() && !locationSearchQuery.trim())}
                        className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 transition-colors text-xs font-semibold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className={`w-4 h-4 text-blue-600 ${fetchingPhoto ? 'animate-spin' : ''}`} />
                        <span>{fetchingPhoto ? 'กำลังค้นหารูป...' : '🔍 ดึงรูปอัตโนมัติจากชื่อ'}</span>
                      </button>
                      <label className="cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 hover:border-blue-400 bg-slate-50/80 hover:bg-blue-50/30 rounded-xl p-2.5 transition-colors text-xs text-slate-700 font-medium min-h-[44px]">
                        <Upload className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>อัปโหลดรูปจากเครื่อง</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageFileUpload}
                        />
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="หรือวางลิงก์รูปภาพ (Image URL)..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium min-h-[40px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รายละเอียดเพิ่มเติม / Note</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เช่น ซื้อตั๋วล่วงหน้า, จองคิวไว้ 10:00 น."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingActivity(null);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : editingActivity ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors z-10"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Activity Photo"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
