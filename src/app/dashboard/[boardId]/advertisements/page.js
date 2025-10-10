'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Button,
  Input,
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
import { Upload, Calendar, Image, Video, Trash2, Edit, Plus, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { uploadMedia } from '../../../../lib/storage';
import { advertisementSettingsService } from '../../../../lib/supabase';

const DEFAULT_AD_SETTINGS = {
  timeBetweenAds: 60, // seconds
  initialDelay: 5, // seconds
  adDisplayDuration: null, // null for auto-duration based on content
  enableAI: false, // AI person detection
  personThreshold: 1, // Number of people to trigger ad
  detectionDuration: 0 // Seconds person must be detected before showing ad (dwell time)
};

export default function AdvertisementsPage() { 
  const { data: session } = useSession();
  const { boardId } = useParams();
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();

  const [advertisements, setAdvertisements] = useState([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [adToDelete, setAdToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAds, setDeletingAds] = useState(new Set());
  const [deletionError, setDeletionError] = useState(null);

  // Realtime connection state for advertisement settings
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [lastUpdate, setLastUpdate] = useState(null);
  const realtimeChannelRef = useRef(null);

  // Local configuration state for batch saving
  const [localAdConfig, setLocalAdConfig] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // General advertisement settings
  const [adSettings, setAdSettings] = useState(() => ({ ...DEFAULT_AD_SETTINGS }));
  const [localAdSettings, setLocalAdSettings] = useState(() => ({ ...DEFAULT_AD_SETTINGS }));
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const adSettingsRef = useRef(adSettings);

  useEffect(() => {
    adSettingsRef.current = adSettings;
  }, [adSettings]);

  const [formData, setFormData] = useState({
    title: '',
    file: null,
    startDate: '',
    endDate: '',
    isActive: false,
    displayDuration: 10000 // Default 10 seconds for images
  });

  const fetchBoardInfo = useCallback(async () => {
    if (!boardId) return;

    try {
      const response = await fetch(`/api/boards?boardId=${boardId}`);
      if (!response.ok) return;

      const data = await response.json();

      if (Array.isArray(data)) {
        const board = data.find(b => b.id === boardId);
        if (board) {
          setBoardName(board.name);
        }
      } else if (data && data.id === boardId) {
        setBoardName(data.name);
      }
    } catch (error) {
      console.error('[Ads Page] Error fetching board info:', error);
    }
  }, [boardId]);

  const fetchAdSettings = useCallback(async () => {
    if (!boardId) return;

    try {
      console.log(`[Ads Page] Fetching advertisement settings for board ${boardId}`);
      const response = await fetch(`/api/advertisements/settings?boardId=${boardId}`);
      if (response.ok) {
        const settings = await response.json();
        console.log(`[Ads Page] Received ad settings:`, settings);
        setAdSettings(settings);
        setLocalAdSettings(settings);
        setHasUnsavedSettings(false);
      } else {
        console.log(`[Ads Page] No settings found, using fallback`);
        const fallback = adSettingsRef.current || { ...DEFAULT_AD_SETTINGS };
        setAdSettings(fallback);
        setLocalAdSettings(fallback);
        setHasUnsavedSettings(false);
      }
    } catch (error) {
      console.error('[Ads Page] Error fetching advertisement settings:', error);
      const fallback = adSettingsRef.current || { ...DEFAULT_AD_SETTINGS };
      setLocalAdSettings(fallback);
    }
  }, [boardId]);

  const fetchAdvertisements = useCallback(async () => {
    if (!boardId) return;

    try {
      const response = await fetch(`/api/advertisements?boardId=${boardId}`);
      if (!response.ok) return;

      const ads = await response.json();
      setAdvertisements(ads);

      const initialConfig = {};
      ads.forEach(ad => {
        initialConfig[ad.id] = ad.is_active;
      });
      setLocalAdConfig(initialConfig);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[Ads Page] Error fetching advertisements:', error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const connectToRealtime = useCallback(() => {
    if (!boardId) return;

    console.log(`[Ads Page] Connecting to advertisement settings Realtime for board ${boardId}`);
    setConnectionStatus('connecting');

    if (realtimeChannelRef.current) {
      advertisementSettingsService.unsubscribe(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const subscription = advertisementSettingsService.subscribeToSettingsChanges(
      boardId,
      (message) => {
        if (!message) return;

        console.log('[Ads Page] Realtime update received:', message);

        if (message.type === 'advertisement_settings_updated') {
          setLastUpdate(new Date());

          if (message.data) {
            setAdSettings(message.data);
            setLocalAdSettings(message.data);
            setHasUnsavedSettings(false);
          } else {
            fetchAdSettings();
          }
        }
      },
      {
        onStatusChange: (status) => {
          switch (status) {
            case 'connecting':
              setConnectionStatus('connecting');
              break;
            case 'connected':
              setConnectionStatus('connected');
              break;
            case 'disconnected':
              setConnectionStatus('disconnected');
              break;
            case 'error':
              setConnectionStatus('error');
              break;
            default:
              break;
          }
        }
      }
    );

    if (!subscription) {
      console.warn('[Ads Page] Failed to establish advertisement settings Realtime subscription');
      setConnectionStatus('error');
      return;
    }

    realtimeChannelRef.current = subscription;
  }, [boardId, fetchAdSettings]);

  const disconnectRealtime = useCallback(() => {
    console.log('[Ads Page] Disconnecting advertisement settings Realtime');

    if (realtimeChannelRef.current) {
      advertisementSettingsService.unsubscribe(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    if (session?.user?.id && boardId) {
      fetchBoardInfo();
      fetchAdvertisements();
      fetchAdSettings();
      connectToRealtime();
    }

    return () => {
      disconnectRealtime();
    };
  }, [
    session,
    boardId,
    fetchBoardInfo,
    fetchAdvertisements,
    fetchAdSettings,
    connectToRealtime,
    disconnectRealtime
  ]);

  useEffect(() => {
    return () => {
      disconnectRealtime();
    };
  }, [disconnectRealtime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    // Show validation toast if uploading new file
    let validationToast = null;
    if (formData.file) {
      validationToast = toast.loading('Validating advertisement content...', {
        duration: Infinity
      });
    }

    try {
      let mediaUrl = '';
      let mediaType = '';

      if (formData.file) {
        try {
          const uploadResult = await uploadMedia(formData.file, {
            bucket: process.env.NEXT_PUBLIC_SUPABASE_ADVERTISEMENT_BUCKET || 'advertisement-media',
            boardId,
            userId: session.user.id,
            kind: formData.file.type.startsWith('image/') ? 'image' : 'video',
            validateContent: true,
          });

          // Dismiss validation toast on success
          if (validationToast) {
            toast.dismiss(validationToast);
            validationToast = null;
          }

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

        } catch (uploadError) {
          // Dismiss validation toast on error
          if (validationToast) {
            toast.dismiss(validationToast);
            validationToast = null;
          }

          // Show specific error toast for blocked content
          if (uploadError.message.startsWith('Upload blocked:')) {
            toast.error(uploadError.message, { duration: 5000 });
            throw uploadError;
          }

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


      let response;
      if (editingAd) {
        const requestData = { id: editingAd.id, ...adData };
        response = await fetch('/api/advertisements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
      } else {
        response = await fetch('/api/advertisements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adData)
        });
      }


      if (response.ok) {
        await fetchAdvertisements();
        resetForm();
        onOpenChange();
        toast.success('Advertisement saved successfully');
      } else {
        // Try to get response text first to see what we're getting
        const responseText = await response.text();

        let error;
        try {
          error = JSON.parse(responseText);
        } catch (parseError) {
          error = { error: `Server error: ${response.status} ${response.statusText}`, details: responseText };
        }

        toast.error(error.error || error.message || error.details || 'Failed to save advertisement');
      }
    } catch (error) {
      // Dismiss validation toast if still showing
      if (validationToast) {
        toast.dismiss(validationToast);
      }

      // Only show error if not already shown (avoid duplicate toasts)
      if (!error.message.startsWith('Upload blocked:')) {
        toast.error(`Failed to save advertisement: ${error.message}`);
      }
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

  const handleDeleteAd = async (adId) => {
    try {
      // Safety check: Prevent deletion of active ads
      const ad = advertisements.find(a => a.id === adId);
      const isAdActive = localAdConfig[adId] ?? ad?.is_active;

      if (isAdActive) {
        setDeletionError('Cannot delete active advertisement. Please deactivate it first.');
        setTimeout(() => setDeletionError(null), 5000);
        setAdToDelete(null);
        onDeleteOpenChange(false);
        return;
      }

      setIsDeleting(true);

      // Add to deleting set for immediate UI feedback
      setDeletingAds(prev => new Set([...prev, adId]));

      // Close modal immediately for better UX
      setAdToDelete(null);
      onDeleteOpenChange(false);

      // Perform deletion
      const response = await fetch(`/api/advertisements?id=${adId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete advertisement');
      }

      // Refresh advertisements list
      await fetchAdvertisements();

    } catch (err) {
      console.error('Error deleting advertisement:', err);
      // Remove from deleting set on error
      setDeletingAds(prev => {
        const newSet = new Set(prev);
        newSet.delete(adId);
        return newSet;
      });
      // Show error message
      setDeletionError(`Failed to delete advertisement: ${err.message}`);
      // Clear error after 5 seconds
      setTimeout(() => setDeletionError(null), 5000);
    } finally {
      setIsDeleting(false);
      // Remove from deleting set when complete
      setDeletingAds(prev => {
        const newSet = new Set(prev);
        newSet.delete(adId);
        return newSet;
      });
    }
  };

  // Local toggle for batch saving
  const toggleActiveLocal = (ad) => {
    const currentLocalState = localAdConfig[ad.id] ?? ad.is_active;
    const newActiveState = !currentLocalState;
    
    console.log(`[Ads Page] Local toggle for ad "${ad.title}": ${currentLocalState} -> ${newActiveState}`);
    
    setLocalAdConfig(prev => ({
      ...prev,
      [ad.id]: newActiveState
    }));
    
    // Check if this creates unsaved changes
    const hasChanges = Object.keys({ ...localAdConfig, [ad.id]: newActiveState }).some(adId => {
      const ad = advertisements.find(a => a.id === adId);
      const localState = adId === ad.id ? newActiveState : localAdConfig[adId];
      return ad && localState !== ad.is_active;
    });
    
    setHasUnsavedChanges(hasChanges);
  };

  // Save all configuration changes
  const saveAdConfiguration = async () => {
    console.log('[Ads Page] Saving advertisement configuration changes');
    setSaving(true);
    
    try {
      // Find all advertisements that have changed
      const changedAds = advertisements.filter(ad => {
        const localState = localAdConfig[ad.id];
        return localState !== undefined && localState !== ad.is_active;
      });
      
      console.log(`[Ads Page] Found ${changedAds.length} advertisements with changes:`, 
        changedAds.map(ad => ({ 
          id: ad.id, 
          title: ad.title, 
          current: ad.is_active, 
          new: localAdConfig[ad.id] 
        }))
      );

      if (changedAds.length === 0) {
        console.log('[Ads Page] No changes to save');
        setSaving(false);
        return;
      }

      // Send all updates in parallel
      const updatePromises = changedAds.map(ad => 
        fetch('/api/advertisements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ad.id,
            isActive: localAdConfig[ad.id]
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update ${ad.title}: ${response.status}`);
          }
          return response.json();
        })
      );

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      console.log(`[Ads Page] Successfully updated ${results.length} advertisements`);

      // Refresh the advertisements list to get the latest state
      await fetchAdvertisements();
      
    } catch (error) {
      console.error('[Ads Page] Error saving configuration:', error);
      alert(`Failed to save changes: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Reset local changes to match server state
  const resetAdConfiguration = () => {
    console.log('[Ads Page] Resetting local configuration');
    const initialConfig = {};
    advertisements.forEach(ad => {
      initialConfig[ad.id] = ad.is_active;
    });
    setLocalAdConfig(initialConfig);
    setHasUnsavedChanges(false);
  };

  // Update local advertisement settings
  const updateAdSetting = (key, value) => {
    console.log(`[Ads Page] Updating ad setting ${key}: ${value}`);
    
    const newSettings = {
      ...localAdSettings,
      [key]: value
    };
    
    setLocalAdSettings(newSettings);
    
    // Check if this creates unsaved changes
    const hasChanges = Object.keys(newSettings).some(settingKey => {
      return newSettings[settingKey] !== adSettings[settingKey];
    });
    
    setHasUnsavedSettings(hasChanges);
  };

  // Save advertisement settings
  const saveAdSettings = async () => {
    console.log('[Ads Page] Saving advertisement settings changes');
    setSavingSettings(true);
    
    try {
      const response = await fetch('/api/advertisements/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          ...localAdSettings
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
      }

      const savedSettings = await response.json();
      console.log(`[Ads Page] Successfully saved advertisement settings:`, savedSettings);

      // Update the local state to match saved settings
      setAdSettings(savedSettings);
      setLocalAdSettings(savedSettings);
      setHasUnsavedSettings(false);
      
    } catch (error) {
      console.error('[Ads Page] Error saving advertisement settings:', error);
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Reset advertisement settings to match server state
  const resetAdSettings = () => {
    console.log('[Ads Page] Resetting advertisement settings');
    setLocalAdSettings(adSettings);
    setHasUnsavedSettings(false);
  };

  // Unified state: check if ANY changes exist
  const hasAnyUnsavedChanges = hasUnsavedChanges || hasUnsavedSettings;
  const isSaving = saving || savingSettings;

  // Unified save function - saves both configuration and settings
  const saveAllChanges = async () => {
    console.log('[Ads Page] Saving all changes (configuration + settings)');

    const promises = [];

    // Save configuration if there are changes
    if (hasUnsavedChanges) {
      setSaving(true);
      promises.push(
        (async () => {
          try {
            // Find all advertisements that have changed
            const changedAds = advertisements.filter(ad => {
              const localState = localAdConfig[ad.id];
              return localState !== undefined && localState !== ad.is_active;
            });

            if (changedAds.length === 0) {
              console.log('[Ads Page] No configuration changes to save');
              return { type: 'config', success: true, count: 0 };
            }

            console.log(`[Ads Page] Saving ${changedAds.length} advertisement configuration changes`);

            // Send all updates in parallel
            const updatePromises = changedAds.map(ad =>
              fetch('/api/advertisements', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: ad.id,
                  isActive: localAdConfig[ad.id]
                })
              }).then(response => {
                if (!response.ok) {
                  throw new Error(`Failed to update ${ad.title}: ${response.status}`);
                }
                return response.json();
              })
            );

            await Promise.all(updatePromises);
            console.log(`[Ads Page] Successfully saved ${changedAds.length} advertisement configurations`);

            // Refresh the advertisements list
            await fetchAdvertisements();

            return { type: 'config', success: true, count: changedAds.length };
          } catch (error) {
            console.error('[Ads Page] Error saving configuration:', error);
            return { type: 'config', success: false, error: error.message };
          }
        })()
      );
    }

    // Save settings if there are changes
    if (hasUnsavedSettings) {
      setSavingSettings(true);
      promises.push(
        (async () => {
          try {
            console.log('[Ads Page] Saving advertisement settings');
            const response = await fetch('/api/advertisements/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boardId,
                ...localAdSettings
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
            }

            const savedSettings = await response.json();
            console.log(`[Ads Page] Successfully saved advertisement settings`);

            // Update the local state to match saved settings
            setAdSettings(savedSettings);
            setLocalAdSettings(savedSettings);
            setHasUnsavedSettings(false);

            return { type: 'settings', success: true };
          } catch (error) {
            console.error('[Ads Page] Error saving settings:', error);
            return { type: 'settings', success: false, error: error.message };
          }
        })()
      );
    }

    if (promises.length === 0) {
      console.log('[Ads Page] No changes to save');
      return;
    }

    // Wait for all operations to complete
    const results = await Promise.all(promises);

    // Check for errors
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.type}: ${e.error}`).join('\n');
      alert(`Some changes failed to save:\n${errorMessages}`);
    } else {
      console.log('[Ads Page] All changes saved successfully');
    }

    // Reset saving states
    setSaving(false);
    setSavingSettings(false);
  };

  // Unified reset function - resets both configuration and settings
  const resetAllChanges = () => {
    console.log('[Ads Page] Resetting all changes (configuration + settings)');

    if (hasUnsavedChanges) {
      resetAdConfiguration();
    }

    if (hasUnsavedSettings) {
      resetAdSettings();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      file: null,
      startDate: '',
      endDate: '',
      isActive: false,
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
              className="bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-300 rounded-2xl flex items-center justify-center "
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 justify-center" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-purple-800 bg-clip-text text-transparent ">
                Advertisement Manager
              </h1>
              <p className="text-gray-600 text-lg mt-2">Manage advertisements for "{boardName}"</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-orange-100 to-purple-100 px-6 py-3 rounded-2xl border border-orange-200/50 shadow-sm">
                <span className="text-orange-800 font-bold text-lg">{advertisements.length} {advertisements.length === 1 ? 'Ad' : 'Ads'}</span>
              </div>
              
              {/* Unified Unsaved Changes Indicator */}
              {hasAnyUnsavedChanges && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-700 transition-all duration-300">
                  <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">
                    Unsaved Changes
                  </span>
                </div>
              )}

              {/* Real-time Connection Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  : connectionStatus === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Live</span>
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Connecting</span>
                  </>
                ) : connectionStatus === 'error' ? (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Error</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Offline</span>
                  </>
                )}
                {lastUpdate && connectionStatus === 'connected' && (
                  <span className="text-xs opacity-75">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
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

            {/* Unified Save All Changes Button */}
            {hasAnyUnsavedChanges && (
              <Button
                size="lg"
                onPress={saveAllChanges}
                isLoading={isSaving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl flex items-center justify-center gap-3 h-14"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
              </Button>
            )}

            {/* Unified Reset Button (only show when there are unsaved changes) */}
            {hasAnyUnsavedChanges && (
              <Button
                size="lg"
                variant="bordered"
                onPress={resetAllChanges}
                disabled={isSaving}
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold text-gray-700 transition-all duration-300 hover:shadow-lg px-6 rounded-2xl flex items-center justify-center gap-3 h-14 bg-white/80 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset All</span>
              </Button>
            )}

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

        {/* Advertisement Settings Panel */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl shadow-lg overflow-hidden">
          <div className="p-8 pb-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-b border-gray-100/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Advertisement Settings
              </h2>
            </div>
            <p className="text-gray-600 ml-11">Configure how advertisements are displayed on your board</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Time Between Ads */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <label className="text-lg font-semibold text-gray-800">Time Between Ads</label>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  How long to show the main display content between advertisements
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Duration: {localAdSettings.timeBetweenAds || 60} seconds
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                      {(localAdSettings.timeBetweenAds || 60) < 30 ? 'Very Fast' :
                       (localAdSettings.timeBetweenAds || 60) <= 60 ? 'Normal' :
                       (localAdSettings.timeBetweenAds || 60) <= 120 ? 'Slow' : 'Very Slow'}
                    </span>
                  </div>
                  <Slider
                    value={localAdSettings.timeBetweenAds || 60}
                    onChange={(value) => updateAdSetting('timeBetweenAds', value)}
                    minValue={10}
                    maxValue={300}
                    step={5}
                    className="w-full"
                    classNames={{
                      track: "bg-gray-200",
                      filler: "bg-gradient-to-r from-green-500 to-emerald-500"
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>10s (Very Fast)</span>
                    <span>300s (Very Slow)</span>
                  </div>
                </div>
              </div>

              {/* Initial Delay */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V9a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <label className="text-lg font-semibold text-gray-800">Initial Delay</label>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  How long to wait before starting the advertisement cycle when the display loads
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Delay: {localAdSettings.initialDelay || 5} seconds
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                      {(localAdSettings.initialDelay || 5) <= 3 ? 'Immediate' :
                       (localAdSettings.initialDelay || 5) <= 10 ? 'Quick' : 'Delayed'}
                    </span>
                  </div>
                  <Slider
                    value={localAdSettings.initialDelay || 5}
                    onChange={(value) => updateAdSetting('initialDelay', value)}
                    minValue={1}
                    maxValue={30}
                    step={1}
                    className="w-full"
                    classNames={{
                      track: "bg-gray-200",
                      filler: "bg-gradient-to-r from-orange-500 to-red-500"
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1s (Immediate)</span>
                    <span>30s (Delayed)</span>
                  </div>
                </div>
              </div>
            </div>

            <Divider className="my-8" />

            {/* AI Person Detection Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI Person Detection
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Use camera to detect people and trigger ads automatically
                  </p>
                </div>
              </div>

              {/* Enable AI Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200/50">
                <div>
                  <span className="text-lg font-semibold text-gray-800">Enable AI Detection</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Show ads when people are detected by camera (uses TensorFlow.js COCO-SSD)
                  </p>
                </div>
                <Checkbox
                  isSelected={localAdSettings.enableAI || false}
                  onValueChange={(checked) => updateAdSetting('enableAI', checked)}
                  size="md"
                  classNames={{
                    wrapper: [
                      "group-data-[selected=true]:bg-gradient-to-r",
                      "group-data-[selected=true]:from-purple-500",
                      "group-data-[selected=true]:to-pink-500",
                      "group-data-[selected=true]:border-transparent",
                      "border-0",
                      "bg-gray-200",
                      "hover:bg-gray-300",
                      "transition-all duration-300",
                      "w-5 h-5"
                    ],
                    icon: "text-white text-xs",
                    base: "transition-all duration-200"
                  }}
                />
              </div>

              {/* Person Threshold - Only show when AI is enabled */}
              {localAdSettings.enableAI && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-200/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <label className="text-lg font-semibold text-gray-800">Person Count Threshold</label>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Minimum number of people detected to trigger advertisement display
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-xl shadow-sm min-h-[80px]">
                      {/* Icon - Centered */}
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>

                      {/* Input - Centered */}
                      <div className="flex-1 flex items-center justify-center max-w-xs">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          step="1"
                          value={localAdSettings.personThreshold || 1}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value >= 1 && value <= 50) {
                              updateAdSetting('personThreshold', value);
                            }
                          }}
                          variant="flat"
                          size="lg"
                          classNames={{
                            input: "text-black font-bold text-xl text-center placeholder:text-gray-300 p-0 m-0 leading-none",
                            inputWrapper: "bg-gradient-to-r from-purple-50 to-pink-50 border-0 shadow-inner h-14 flex items-center justify-center p-0",
                            base: "w-full",
                            innerWrapper: "p-0 m-0 flex items-center justify-center"
                          }}
                        />
                      </div>

                      {/* Label - Centered */}
                      <div className="flex flex-col items-end justify-center flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-700 leading-tight">
                          {(localAdSettings.personThreshold || 1) === 1 ? 'Person' : 'People'}
                        </div>
                        <div className="text-xs text-gray-500 leading-tight">Required</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 bg-white/80 p-3 rounded-lg border border-purple-100">
                      💡 <strong>How it works:</strong> The display page will use your device camera to detect people. When {localAdSettings.personThreshold || 1} or more {(localAdSettings.personThreshold || 1) === 1 ? 'person is' : 'people are'} detected, advertisements will be shown. If camera is unavailable, ads will display on timer as normal.
                    </p>
                  </div>

                  {/* Detection Duration (Dwell Time) */}
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-base font-semibold text-gray-800">Detection Duration</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      How long a person must be detected before showing an advertisement
                    </p>
                    <Slider
                      size="md"
                      step={1}
                      minValue={0}
                      maxValue={30}
                      value={localAdSettings.detectionDuration || 0}
                      onChange={(value) => updateAdSetting('detectionDuration', value)}
                      classNames={{
                        base: "max-w-full",
                        track: "bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200",
                        filler: "bg-gradient-to-r from-blue-500 to-cyan-500",
                        thumb: "bg-white border-4 border-blue-500 shadow-lg hover:shadow-xl transition-shadow"
                      }}
                      renderLabel={() => (
                        <div className="flex justify-between items-center w-full mb-2">
                          <span className="text-sm font-medium text-gray-700">Duration</span>
                          <span className="text-lg font-bold text-blue-600">
                            {(localAdSettings.detectionDuration || 0) === 0
                              ? 'Instant'
                              : `${localAdSettings.detectionDuration}s`}
                          </span>
                        </div>
                      )}
                      renderValue={(value) => (
                        <span className="text-sm font-medium text-gray-600">
                          {value === 0 ? '0s (Instant)' : `${value} second${value !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    />
                    <p className="text-xs text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      ⏱️ <strong>What this does:</strong> {(localAdSettings.detectionDuration || 0) === 0
                        ? 'Ads show immediately when threshold is met'
                        : <>Person must remain detected for <span className="font-bold text-sm text-blue-700">{localAdSettings.detectionDuration} second{(localAdSettings.detectionDuration || 0) !== 1 ? 's' : ''}</span> before ad appears. If they leave during this time, the timer resets.</>}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Unified Unsaved Changes Banner */}
        {hasAnyUnsavedChanges && (
          <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/50 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-800 mb-1">
                    You have unsaved changes
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    {hasUnsavedChanges && hasUnsavedSettings && 'Advertisement settings and configuration have been modified. '}
                    {hasUnsavedChanges && !hasUnsavedSettings && 'Advertisement configuration has been modified. '}
                    {!hasUnsavedChanges && hasUnsavedSettings && 'Advertisement settings have been modified. '}
                    Click "Save All Changes" to apply them to all display screens, or "Reset All" to discard them.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="bordered"
                  onPress={resetAllChanges}
                  disabled={isSaving}
                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-100 font-medium transition-all duration-300 rounded-xl"
                >
                  Reset All
                </Button>
                <Button
                  onPress={saveAllChanges}
                  isLoading={isSaving}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 font-semibold transition-all duration-300 hover:shadow-lg rounded-xl"
                >
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advertisements.map((ad) => {
            const isBeingDeleted = deletingAds.has(ad.id);
            const isAdActive = localAdConfig[ad.id] ?? ad.is_active;

            return (
            <div
              key={ad.id}
              className={`group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/90 hover:border-orange-300/50 ${
                isBeingDeleted ? 'opacity-50 scale-95 pointer-events-none' : ''
              }`}
            >
              {/* Deletion overlay */}
              {isBeingDeleted && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-red-600 font-medium text-sm">Deleting...</p>
                  </div>
                </div>
              )}

              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {(() => {
                  const currentServerState = ad.is_active && isDateActive(ad.start_date, ad.end_date);
                  const pendingLocalState = (localAdConfig[ad.id] ?? ad.is_active) && isDateActive(ad.start_date, ad.end_date);
                  const hasUnsavedChange = localAdConfig[ad.id] !== undefined && localAdConfig[ad.id] !== ad.is_active;
                  
                  if (hasUnsavedChange) {
                    // Show pending state with unsaved indicator
                    if (pendingLocalState) {
                      return (
                        <>
                          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-sm animate-pulse"></div>
                          <span className="text-xs font-medium text-yellow-700 bg-yellow-100/80 px-2 py-1 rounded-full">
                            Pending Active
                          </span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm animate-pulse"></div>
                          <span className="text-xs font-medium text-orange-700 bg-orange-100/80 px-2 py-1 rounded-full">
                            Pending Inactive
                          </span>
                        </>
                      );
                    }
                  } else {
                    // Show current server state
                    if (currentServerState) {
                      return (
                        <>
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
                          <span className="text-xs font-medium text-green-700 bg-green-100/80 px-2 py-1 rounded-full">Active</span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <div className="w-2.5 h-2.5 bg-gray-400 rounded-full shadow-sm"></div>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100/80 px-2 py-1 rounded-full">Inactive</span>
                        </>
                      );
                    }
                  }
                })()}
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
                    <div className="flex items-center gap-2">
                      <Checkbox
                        isSelected={localAdConfig[ad.id] ?? ad.is_active}
                        onValueChange={() => toggleActiveLocal(ad)}
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
                      {/* Show unsaved indicator for this ad */}
                      {localAdConfig[ad.id] !== undefined && localAdConfig[ad.id] !== ad.is_active && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Unsaved changes"></div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      size="md"
                      variant="flat"
                      onPress={() => handleEdit(ad)}
                      className="w-full bg-blue-100/80 text-blue-700 hover:bg-blue-200 hover:text-blue-800 font-medium rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02] flex items-center justify-center gap-2 h-12"
                    >
                      <Edit className="w-4 h-4 flex-shrink-0" />
                      <span>Edit</span>
                    </Button>

                    {!isAdActive && (
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => { setAdToDelete(ad); onDeleteOpen(); }}
                        isDisabled={isBeingDeleted}
                        className="w-full text-red-600 hover:bg-red-50/80 font-medium rounded-xl transition-all duration-300 hover:shadow-sm flex items-center justify-center gap-2 h-10"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                        <span>{isBeingDeleted ? 'Deleting...' : 'Delete Advertisement'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        placement="top-center"
        classNames={{
          base: "bg-white/95 backdrop-blur-md rounded-3xl border-0",
          backdrop: "bg-black/30 backdrop-blur-sm"
        }}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } },
          }
        }}
      >
        <ModalContent className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-900 p-8 pb-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-100/50">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-700">Delete Advertisement</h3>
                </div>
                <p className="text-sm text-gray-600 font-normal ml-11">This action cannot be undone.</p>
              </ModalHeader>
              <ModalBody className="p-8">
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Are you sure you want to delete
                    {" "}
                    <span className="font-semibold">{adToDelete?.title || 'this advertisement'}</span>
                    ?
                  </p>
                  <p className="text-gray-500 text-sm">
                    This advertisement is inactive and can be safely deleted. All advertisement data will be permanently removed from the database.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter className="p-8 pt-4 bg-gray-50/30 border-t border-gray-100/50">
                <div className="flex gap-3 w-full">
                  <Button
                    variant="bordered"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all duration-300 rounded-xl hover:shadow-md flex items-center justify-center h-12"
                    onPress={() => { setAdToDelete(null); onClose(); }}
                    isDisabled={isDeleting}
                  >
                    <span>Cancel</span>
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12"
                    onPress={() => adToDelete && handleDeleteAd(adToDelete.id)}
                    isDisabled={!adToDelete || isDeleting}
                  >
                    <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Error Toast */}
      {deletionError && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="text-red-800 font-semibold text-sm mb-1">Deletion Failed</h4>
                <p className="text-red-700 text-xs leading-relaxed">{deletionError}</p>
              </div>
              <button
                onClick={() => setDeletionError(null)}
                className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
