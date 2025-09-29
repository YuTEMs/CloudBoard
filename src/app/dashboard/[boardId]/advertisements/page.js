'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Switch,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Slider,
  Divider
} from '@heroui/react';
import { Upload, Calendar, Image, Video, Trash2, Edit, Plus, ArrowLeft } from 'lucide-react';
import { uploadMedia } from '../../../../lib/storage';

export default function AdvertisementsPage() { 
  const { data: session } = useSession();
  const { boardId } = useParams();
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [advertisements, setAdvertisements] = useState([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    file: null,
    startDate: '',
    endDate: '',
    isActive: true,
    displayDuration: 10000 // Default 10 seconds for images
  });

  useEffect(() => {
    if (session?.user?.id && boardId) {
      fetchBoardInfo();
      fetchAdvertisements();
    }
  }, [session, boardId]);

  const fetchBoardInfo = async () => {
    try {
      const response = await fetch(`/api/boards?boardId=${boardId}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both single board object and array of boards
        if (Array.isArray(data)) {
          const board = data.find(b => b.id === boardId);
          if (board) {
            setBoardName(board.name);
          }
        } else if (data && data.id === boardId) {
          // Single board object
          setBoardName(data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching board info:', error);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch(`/api/advertisements?boardId=${boardId}`);
      if (response.ok) {
        const ads = await response.json();
        setAdvertisements(ads);
      }
    } catch (error) {
      console.error('Error fetching advertisements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let mediaUrl = '';
      let mediaType = '';

      if (formData.file) {
        try {
          const uploadResult = await uploadMedia(formData.file, {
            bucket: process.env.NEXT_PUBLIC_SUPABASE_ADVERTISEMENT_BUCKET || 'advertisement-media',
            boardId,
            userId: session.user.id,
            kind: formData.file.type.startsWith('image/') ? 'image' : 'video'
          });

          // Handle different response formats from uploadMedia
          if (uploadResult?.publicUrl) {
            mediaUrl = uploadResult.publicUrl;
          } else if (uploadResult?.url) {
            mediaUrl = uploadResult.url;
          } else if (uploadResult?.path) {
            // Construct public URL from path if needed
            mediaUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${uploadResult.bucket || process.env.NEXT_PUBLIC_SUPABASE_ADVERTISEMENT_BUCKET || 'advertisement-media'}/${uploadResult.path}`;
          } else {
            throw new Error('Upload completed but no URL returned');
          }

          mediaType = formData.file.type.startsWith('image/') ? 'image' : 'video';
          console.log('Upload successful:', { mediaUrl, mediaType });

        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
      }

      const adData = {
        boardId,
        title: formData.title,
        mediaUrl,
        mediaType,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        isActive: formData.isActive,
        displayDuration: mediaType === 'image' ? formData.displayDuration : null
      };

      console.log('Sending advertisement data:', adData);

      let response;
      if (editingAd) {
        const requestData = { id: editingAd.id, ...adData };
        console.log('PUT request data:', requestData);
        response = await fetch('/api/advertisements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
      } else {
        console.log('POST request data:', adData);
        response = await fetch('/api/advertisements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adData)
        });
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      if (response.ok) {
        console.log('Advertisement saved successfully');
        await fetchAdvertisements();
        resetForm();
        onOpenChange();
      } else {
        // Try to get response text first to see what we're getting
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        let error;
        try {
          error = JSON.parse(responseText);
        } catch (parseError) {
          error = { error: `Server error: ${response.status} ${response.statusText}`, details: responseText };
        }

        console.error('Server error:', error);
        console.error('Response status:', response.status);
        alert(error.error || error.message || error.details || 'Failed to save advertisement');
      }
    } catch (error) {
      console.error('Error saving advertisement:', error);
      alert(`Failed to save advertisement: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      file: null,
      startDate: ad.start_date ? ad.start_date.split('T')[0] : '',
      endDate: ad.end_date ? ad.end_date.split('T')[0] : '',
      isActive: ad.is_active,
      displayDuration: ad.display_duration || 10000
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      const response = await fetch(`/api/advertisements?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAdvertisements();
      } else {
        alert('Failed to delete advertisement');
      }
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      alert('Failed to delete advertisement');
    }
  };

  const toggleActive = async (ad) => {
    try {
      const response = await fetch('/api/advertisements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ad.id,
          isActive: !ad.is_active
        })
      });

      if (response.ok) {
        await fetchAdvertisements();
      }
    } catch (error) {
      console.error('Error toggling advertisement status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      file: null,
      startDate: '',
      endDate: '',
      isActive: true,
      displayDuration: 10000
    });
    setEditingAd(null);
  };

  const isDateActive = (startDate, endDate) => {
    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-8">
            <Button
              isIconOnly
              variant="light"
              onPress={() => router.push('/dashboard')}
              className="bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-300 rounded-2xl"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-purple-800 bg-clip-text text-transparent">
                Advertisement Manager
              </h1>
              <p className="text-gray-600 text-lg mt-2">Manage advertisements for "{boardName}"</p>
            </div>
            <div className="bg-gradient-to-r from-orange-100 to-purple-100 px-6 py-3 rounded-2xl border border-orange-200/50 shadow-sm">
              <span className="text-orange-800 font-bold text-lg">{advertisements.length} {advertisements.length === 1 ? 'Ad' : 'Ads'}</span>
            </div>
          </div>

          <div className="flex gap-6">
            <Button
              size="lg"
              onPress={() => {
                resetForm();
                onOpen();
              }}
              className="bg-gradient-to-r from-orange-600 via-purple-600 to-pink-600 text-white hover:from-orange-700 hover:via-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl flex items-center justify-center gap-3 h-14"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Add Advertisement</span>
            </Button>
            <Button
              size="lg"
              variant="bordered"
              onPress={() => router.push(`/dashboard/${boardId}/analytics`)}
              className="border-gray-200 hover:border-purple-400 hover:bg-purple-50 font-semibold text-black transition-all duration-300 hover:shadow-lg px-8 rounded-2xl flex items-center justify-center gap-3 h-14 bg-white/80 backdrop-blur-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>View Analytics</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advertisements.map((ad) => (
            <div
              key={ad.id}
              className="group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/90 hover:border-orange-300/50"
            >
              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {ad.is_active && isDateActive(ad.start_date, ad.end_date) ? (
                  <>
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700 bg-green-100/80 px-2 py-1 rounded-full">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full shadow-sm"></div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100/80 px-2 py-1 rounded-full">Inactive</span>
                  </>
                )}
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-200 line-clamp-1">
                        {ad.title}
                      </h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-purple-500 rounded-full group-hover:w-16 transition-all duration-300"></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ad.media_type === 'image' ? (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        <Image className="w-4 h-4" />
                        <span className="text-sm font-medium">Image</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                        <Video className="w-4 h-4" />
                        <span className="text-sm font-medium">Video</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Preview */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-6 overflow-hidden border border-gray-200/50">
                  {ad.media_type === 'image' ? (
                    <img
                      src={ad.media_url}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={ad.media_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                    />
                  )}
                </div>

                {/* Metadata */}
                <div className="mb-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="space-y-2 text-xs text-gray-500">
                    {ad.start_date && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Start Date</span>
                        <span className="bg-white/80 px-2 py-1 rounded-lg">{new Date(ad.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {ad.end_date && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">End Date</span>
                        <span className="bg-white/80 px-2 py-1 rounded-lg">{new Date(ad.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {ad.media_type === 'image' && ad.display_duration && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Display Duration</span>
                        <span className="bg-white/80 px-2 py-1 rounded-lg">{ad.display_duration / 1000}s</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600">Created</span>
                      <span className="bg-white/80 px-2 py-1 rounded-lg">{new Date(ad.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Active Status</span>
                    <Checkbox
                      isSelected={ad.is_active}
                      onValueChange={() => toggleActive(ad)}
                      size="sm"
                      classNames={{
                        wrapper: [
                          "group-data-[selected=true]:bg-gradient-to-r",
                          "group-data-[selected=true]:from-orange-500",
                          "group-data-[selected=true]:to-purple-500",
                          "group-data-[selected=true]:border-transparent",
                          "border-0",
                          "bg-gray-200",
                          "hover:bg-gray-300",
                          "transition-all duration-300",
                          "w-4 h-4"
                        ],
                        icon: "text-white text-xs",
                        base: "transition-all duration-200"
                      }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      size="md"
                      variant="flat"
                      onPress={() => handleEdit(ad)}
                      className="flex-1 bg-blue-100/80 text-blue-700 hover:bg-blue-200 hover:scale-[1.02] transition-all duration-200 rounded-xl font-medium h-11 flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      size="md"
                      variant="flat"
                      onPress={() => handleDelete(ad.id)}
                      className="flex-1 bg-red-100/80 text-red-700 hover:bg-red-200 hover:scale-[1.02] transition-all duration-200 rounded-xl font-medium h-11 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

        {advertisements.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-lg">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-purple-100 rounded-3xl flex items-center justify-center">
                <Upload className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-purple-800 bg-clip-text text-transparent mb-4">
                No Advertisements Yet
              </h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                Create your first advertisement to start promoting content on this board
              </p>
              <Button
                size="lg"
                onPress={() => {
                  resetForm();
                  onOpen();
                }}
                className="bg-gradient-to-r from-orange-600 via-purple-600 to-pink-600 text-white hover:from-orange-700 hover:via-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl"
              >
                <Plus className="w-5 h-5" />
                <span>Create Advertisement</span>
              </Button>
            </div>
          </div>
        )}

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="3xl"
        classNames={{
          base: "bg-white/95 backdrop-blur-md rounded-3xl border-0",
          backdrop: "bg-black/30 backdrop-blur-sm"
        }}
      >
        <ModalContent className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          {(onClose) => (
            <form onSubmit={handleSubmit}>
              <ModalHeader className="flex flex-col gap-1 text-gray-900 p-8 pb-6 bg-gradient-to-r from-orange-50 to-purple-50 border-b border-gray-100/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    {editingAd ? <Edit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                    {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 font-normal ml-11">
                  {editingAd ? 'Update your advertisement details' : 'Design your perfect advertisement for this board'}
                </p>
              </ModalHeader>
              <ModalBody className="p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Advertisement Title</label>
                    <Input
                      placeholder="Enter a catchy advertisement title..."
                      variant="bordered"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      classNames={{
                        input: "text-gray-900 font-medium",
                        inputWrapper: "border-gray-200 hover:border-orange-400 focus-within:border-orange-500 bg-white/80 backdrop-blur-sm transition-all duration-300 rounded-xl group-data-[focus=true]:border-orange-500 group-data-[focus=true]:shadow-lg"
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">
                      Media File {!editingAd && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                        required={!editingAd}
                        className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-orange-50 file:to-purple-50 file:text-orange-700 hover:file:from-orange-100 hover:file:to-purple-100 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm p-3 transition-all duration-300 hover:border-orange-400"
                      />
                    </div>
                    <p className="text-xs text-gray-500 bg-gray-50/50 p-2 rounded-lg">
                      📁 Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, WebM). Maximum file size: 50MB.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">Start Date (Optional)</label>
                      <Input
                        type="date"
                        variant="bordered"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        classNames={{
                          input: "text-gray-900 font-medium",
                          inputWrapper: "border-gray-200 hover:border-orange-400 focus-within:border-orange-500 bg-white/80 backdrop-blur-sm transition-all duration-300 rounded-xl group-data-[focus=true]:border-orange-500 group-data-[focus=true]:shadow-lg"
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">End Date (Optional)</label>
                      <Input
                        type="date"
                        variant="bordered"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        classNames={{
                          input: "text-gray-900 font-medium",
                          inputWrapper: "border-gray-200 hover:border-orange-400 focus-within:border-orange-500 bg-white/80 backdrop-blur-sm transition-all duration-300 rounded-xl group-data-[focus=true]:border-orange-500 group-data-[focus=true]:shadow-lg"
                        }}
                      />
                    </div>
                  </div>

                  {/* Duration Controls - Only for Images */}
                  {(formData.file?.type?.startsWith('image/') || (editingAd?.media_type === 'image' && !formData.file)) && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50/50 rounded-2xl border border-blue-200/50">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700">Display Duration</span>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Images Only</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Duration: {formData.displayDuration / 1000}s
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              {formData.displayDuration < 5000 ? 'Quick' :
                               formData.displayDuration <= 10000 ? 'Normal' : 'Slow'}
                            </span>
                          </div>
                          <Slider
                            value={formData.displayDuration}
                            onChange={(value) => setFormData({ ...formData, displayDuration: value })}
                            minValue={3000}
                            maxValue={30000}
                            step={1000}
                            className="w-full"
                            classNames={{
                              track: "bg-gray-200",
                              filler: "bg-gradient-to-r from-blue-500 to-purple-500"
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>3s (Quick)</span>
                            <span>30s (Slow)</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 bg-gray-50/50 p-2 rounded-lg">
                          📷 Image advertisements will display for this duration before moving to the next ad.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50/50 rounded-2xl border border-gray-200/50">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Active Status</span>
                      <p className="text-xs text-gray-500">Enable this advertisement to display on the board</p>
                    </div>
                    <Switch
                      isSelected={formData.isActive}
                      onValueChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      classNames={{
                        wrapper: "group-data-[selected=true]:bg-gradient-to-r group-data-[selected=true]:from-orange-500 group-data-[selected=true]:to-purple-500"
                      }}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="p-8 pt-6 bg-gray-50/30 border-t border-gray-100/50">
                <div className="flex gap-3 w-full">
                  <Button
                    variant="bordered"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all duration-300 rounded-xl hover:shadow-md flex items-center justify-center h-12"
                    onPress={onClose}
                  >
                    <span>Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    isLoading={uploading}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-purple-600 text-white hover:from-orange-700 hover:to-purple-700 font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12"
                  >
                    <span>{editingAd ? 'Update' : 'Create'} Advertisement</span>
                  </Button>
                </div>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}