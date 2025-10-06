'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Upload, Calendar, Image, Video, Trash2, Edit, Plus, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
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

  // SSE Real-time connection state
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [lastUpdate, setLastUpdate] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Local configuration state for batch saving
  const [localAdConfig, setLocalAdConfig] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // General advertisement settings
  const [adSettings, setAdSettings] = useState({
    timeBetweenAds: 60, // seconds
    initialDelay: 5, // seconds
    adDisplayDuration: null, // null for auto-duration based on content
    enableAI: false, // AI person detection
    personThreshold: 1, // Number of people to trigger ad
    detectionDuration: 0 // Seconds person must be detected before showing ad (dwell time)
  });
  const [localAdSettings, setLocalAdSettings] = useState({});
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    file: null,
    startDate: '',
    endDate: '',
    isActive: true,
    displayDuration: 10000 // Default 10 seconds for images
  });

  // SSE Connection Management
  const connectToSSE = useCallback(() => {
    if (!boardId) return;

    console.log(`[Ads Page] Connecting to SSE for board ${boardId}`);
    setConnectionStatus('connecting');

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(`/api/stream?boardId=${boardId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`[Ads Page] SSE connected for board ${boardId}`);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[Ads Page] SSE message received:`, data);

          if (data.type === 'connected') {
            console.log(`[Ads Page] Connection confirmed for board ${boardId}`);
          } else if (data.type === 'advertisements_updated') {
            console.log(`[Ads Page] Advertisement update received:`, data);
            setLastUpdate(new Date());
            
            // Refresh advertisements list when any advertisement changes
            fetchAdvertisements();
            
            // Show brief visual feedback
            if (data.changeType === 'ACTIVE_STATUS_CHANGE') {
              console.log(`[Ads Page] Active status changed for ad: ${data.advertisementId}`);
            }
            
            // Note: fetchAdvertisements() will reset localAdConfig to match server state
            // This ensures we don't have conflicts with changes from other users
          } else if (data.type === 'ping') {
            // Handle ping silently
          }
        } catch (error) {
          console.error(`[Ads Page] Error parsing SSE message:`, error);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[Ads Page] SSE error:`, error);
        setConnectionStatus('error');
        
        // Attempt reconnection with exponential backoff
        const maxAttempts = 5;
        const baseDelay = 1000;
        
        if (reconnectAttemptsRef.current < maxAttempts) {
          const delay = baseDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[Ads Page] Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectToSSE();
          }, delay);
        } else {
          console.log(`[Ads Page] Max reconnection attempts reached`);
          setConnectionStatus('disconnected');
        }
      };

    } catch (error) {
      console.error(`[Ads Page] Failed to create SSE connection:`, error);
      setConnectionStatus('error');
    }
  }, [boardId]);

  const disconnectSSE = useCallback(() => {
    console.log(`[Ads Page] Disconnecting SSE`);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // Setup SSE connection when board loads
  useEffect(() => {
    if (session?.user?.id && boardId) {
      fetchBoardInfo();
      fetchAdvertisements();
      fetchAdSettings();
      connectToSSE();
    }

    return () => {
      disconnectSSE();
    };
  }, [session, boardId, connectToSSE, disconnectSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSSE();
    };
  }, [disconnectSSE]);

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
    }
  };

  const fetchAdSettings = async () => {
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
        // Use default settings if none exist
        console.log(`[Ads Page] No settings found, using defaults`);
        setLocalAdSettings(adSettings);
      }
    } catch (error) {
      console.error('[Ads Page] Error fetching advertisement settings:', error);
      setLocalAdSettings(adSettings);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch(`/api/advertisements?boardId=${boardId}`);
      if (response.ok) {
        const ads = await response.json();
        setAdvertisements(ads);
        
        // Initialize local configuration with current active states
        const initialConfig = {};
        ads.forEach(ad => {
          initialConfig[ad.id] = ad.is_active;
        });
        setLocalAdConfig(initialConfig);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
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

        } catch (uploadError) {
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
      } else {
        // Try to get response text first to see what we're getting
        const responseText = await response.text();

        let error;
        try {
          error = JSON.parse(responseText);
        } catch (parseError) {
          error = { error: `Server error: ${response.status} ${response.statusText}`, details: responseText };
        }

        alert(error.error || error.message || error.details || 'Failed to save advertisement');
      }
    } catch (error) {
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
      alert('Failed to delete advertisement');
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
              
              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-700 transition-all duration-300">
                  <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">
                    {Object.keys(localAdConfig).filter(adId => {
                      const ad = advertisements.find(a => a.id === adId);
                      return ad && localAdConfig[adId] !== ad.is_active;
                    }).length} Unsaved Changes
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

            {/* Save Configuration Button */}
            {hasUnsavedChanges && (
              <Button
                size="lg"
                onPress={saveAdConfiguration}
                isLoading={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl flex items-center justify-center gap-3 h-14"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </Button>
            )}

            {/* Reset Button (only show when there are unsaved changes) */}
            {hasUnsavedChanges && (
              <Button
                size="lg"
                variant="bordered"
                onPress={resetAdConfiguration}
                disabled={saving}
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold text-gray-700 transition-all duration-300 hover:shadow-lg px-6 rounded-2xl flex items-center justify-center gap-3 h-14 bg-white/80 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
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
              {hasUnsavedSettings && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-yellow-700">Unsaved</span>
                </div>
              )}
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

            {/* Save Settings Section */}
            {hasUnsavedSettings && (
              <div className="mt-8 pt-6 border-t border-gray-200/50">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">Settings Changed</h4>
                      <p className="text-sm text-blue-700">Save your changes to apply them to all display screens</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="bordered"
                      onPress={resetAdSettings}
                      disabled={savingSettings}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100 font-medium transition-all duration-300 rounded-xl"
                    >
                      Reset
                    </Button>
                    <Button
                      onPress={saveAdSettings}
                      isLoading={savingSettings}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 hover:shadow-lg rounded-xl"
                    >
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
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
                    You have {Object.keys(localAdConfig).filter(adId => {
                      const ad = advertisements.find(a => a.id === adId);
                      return ad && localAdConfig[adId] !== ad.is_active;
                    }).length} unsaved changes
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Click "Save Configuration" to apply your changes to the display board, or "Reset" to discard them.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="bordered"
                  onPress={resetAdConfiguration}
                  disabled={saving}
                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-100 font-medium transition-all duration-300 rounded-xl"
                >
                  Reset
                </Button>
                <Button
                  onPress={saveAdConfiguration}
                  isLoading={saving}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 font-semibold transition-all duration-300 hover:shadow-lg rounded-xl"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advertisements.map((ad) => (
            <div
              key={ad.id}
              className="group relative bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/90 hover:border-orange-300/50"
            >
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