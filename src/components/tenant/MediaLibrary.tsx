import { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, FileText, Video, Trash2, Download, X, Edit2, Search, Filter, HardDrive, File, Image, Eye, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { apiService } from '../../utils/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Pagination } from '../shared/Pagination';

type UploadItem = {
  id: string;             // local key — random, not the server id
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;       // 0..100
  error?: string;
};

interface MediaItem {
  id: string;
  name: string;
  originalName: string;
  type: 'image' | 'video' | 'document' | 'audio';
  size: number;
  checksum: string;
  uploadedAt: string;
  expiresAt: string;
  url: string;
  mimeType: string;
}

interface MediaStats {
  total: number;
  storageUsed: number;
  images: number;
  videos: number;
  documents: number;
  audio: number;
}

export function MediaLibrary() {
  const { currentOrganization } = useOrganization();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editName, setEditName] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<MediaStats>({
    total: 0,
    storageUsed: 0,
    images: 0,
    videos: 0,
    documents: 0,
    audio: 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get API base URL
  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';
  };

  // Fetch media items and stats
  useEffect(() => {
    if (!currentOrganization) return;
    fetchMediaItems();
    fetchStats();
  }, [currentOrganization?.id, currentPage]);

  // Filter media items
  useEffect(() => {
    let filtered = [...mediaItems];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.originalName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    setFilteredItems(filtered);
  }, [mediaItems, searchQuery, typeFilter]);

  const fetchMediaItems = async () => {
    setLoading(true);
    try {
      const response = await apiService.media.list({ page: currentPage, limit: recordsPerPage });
      if (response.success && response.data) {
        const mediaData = response.data.media || [];
        setMediaItems(mediaData.map((item: any) => ({
          id: item.id,
          name: item.name || item.originalName,
          originalName: item.originalName,
          type: item.type,
          size: item.size,
          checksum: item.checksum,
          uploadedAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
          expiresAt: item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never',
          url: item.url,
          mimeType: item.mimeType,
        })));
        
        // Extract pagination metadata
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalRecords(response.data.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalRecords(mediaData.length);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch media:', error);
      toast.error('Failed to load media', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.media.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getMediaUrl = (media: MediaItem): string => {
    return `${getApiBaseUrl()}${media.url}`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-blue-600" />;
      case 'video':
        return <Video className="w-8 h-8 text-purple-600" />;
      case 'document':
        return <FileText className="w-8 h-8 text-orange-600" />;
      case 'audio':
        return <FileText className="w-8 h-8 text-green-600" />;
      default:
        return <FileText className="w-8 h-8 text-gray-600" />;
    }
  };

  const renderPreview = (media: MediaItem) => {
    const mediaUrl = getMediaUrl(media);
    
    if (media.type === 'image') {
      return (
        <img
          src={mediaUrl}
          alt={media.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback to icon if image fails to load
            const target = e.target as HTMLImageElement;
            const parent = target.parentElement;
            if (parent) {
              target.style.display = 'none';
              // Show fallback icon
              if (!parent.querySelector('.fallback-icon-container')) {
                const iconContainer = document.createElement('div');
                iconContainer.className = 'fallback-icon-container w-full h-full flex items-center justify-center';
                iconContainer.innerHTML = '<svg class="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                parent.appendChild(iconContainer);
              }
            }
          }}
        />
      );
    } else if (media.type === 'video') {
      return (
        <div className="w-full h-full relative">
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            controls={false}
            muted
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Video className="w-12 h-12 text-white" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {getFileIcon(media.type)}
        </div>
      );
    }
  };

  const MAX_SIZE = 16 * 1024 * 1024;
  const makeQueueId = () => Math.random().toString(36).slice(2);

  // Validate + enqueue + run uploads in parallel.
  // Files larger than MAX_SIZE are added to the queue with status='error' so the
  // user can see *why* a file was rejected instead of having it silently dropped.
  const enqueueAndUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const initial: UploadItem[] = files.map((file) => {
      const id = makeQueueId();
      if (file.size > MAX_SIZE) {
        return { id, file, status: 'error', progress: 0, error: 'Exceeds 16MB' };
      }
      return { id, file, status: 'pending', progress: 0 };
    });

    setUploadQueue((q) => [...q, ...initial]);
    setUploading(true);

    const updateItem = (id: string, patch: Partial<UploadItem>) =>
      setUploadQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));

    const uploadable = initial.filter((it) => it.status === 'pending');
    const results = await Promise.allSettled(
      uploadable.map(async (it) => {
        updateItem(it.id, { status: 'uploading', progress: 0 });
        try {
          const r = await apiService.media.upload(it.file, (percent) => {
            updateItem(it.id, { progress: percent });
          });
          if (r.success) {
            updateItem(it.id, { status: 'done', progress: 100 });
            return true;
          }
          updateItem(it.id, { status: 'error', error: r.error?.message || 'Upload failed' });
          return false;
        } catch (e: any) {
          updateItem(it.id, {
            status: 'error',
            error: e.response?.data?.error?.message || e.message || 'Upload failed',
          });
          return false;
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failCount = uploadable.length - successCount;
    const rejectedForSize = initial.length - uploadable.length;

    if (successCount > 0) toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
    if (failCount > 0) toast.error(`${failCount} file${failCount > 1 ? 's' : ''} failed to upload`);
    if (rejectedForSize > 0) {
      toast.error(`${rejectedForSize} file${rejectedForSize > 1 ? 's' : ''} skipped (over 16MB limit)`);
    }

    fetchMediaItems();
    fetchStats();
    setUploading(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    await enqueueAndUpload(Array.from(fileList));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag handlers — wired on the upload modal's drop zone
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    await enqueueAndUpload(dropped);
  };

  // ---- Bulk selection ---------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredItems.map((m) => m.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} file${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkDeleting(true);
    let success = 0;
    let failure = 0;
    // Sequential — keeps server load predictable; small sets so latency is fine.
    for (const id of ids) {
      try {
        const r = await apiService.media.delete(id);
        if (r.success) success++;
        else failure++;
      } catch {
        failure++;
      }
    }

    if (success > 0) toast.success(`${success} file${success > 1 ? 's' : ''} deleted`);
    if (failure > 0) toast.error(`${failure} file${failure > 1 ? 's' : ''} could not be deleted`);

    clearSelection();
    setBulkDeleting(false);
    fetchMediaItems();
    fetchStats();
  };

  const handleBulkDownload = async () => {
    const items = filteredItems.filter((m) => selectedIds.has(m.id));
    if (items.length === 0) return;

    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      // Fetch in parallel — most browsers cap concurrency at ~6 per origin which
      // is fine; for very large selections this would warrant a worker.
      await Promise.all(
        items.map(async (m) => {
          const resp = await fetch(getMediaUrl(m));
          if (!resp.ok) throw new Error(`Fetch failed for ${m.name}`);
          const blob = await resp.blob();
          zip.file(m.originalName || m.name, blob);
        })
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `media-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${items.length} file${items.length > 1 ? 's' : ''} as zip`);
    } catch (e: any) {
      toast.error('Bulk download failed', { description: e.message });
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleEdit = (media: MediaItem) => {
    setEditingMedia(media);
    setEditName(media.name);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingMedia || !editName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    try {
      const response = await apiService.media.update(editingMedia.id, { name: editName.trim() });
      if (response.success) {
        toast.success('Media updated successfully');
        setShowEditModal(false);
        setEditingMedia(null);
        setEditName('');
        fetchMediaItems();
      }
    } catch (error: any) {
      console.error('Failed to update media:', error);
      toast.error('Failed to update media', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media file?')) {
      return;
    }

    try {
      const response = await apiService.media.delete(id);
      if (response.success) {
        toast.success('Media deleted successfully');
        fetchMediaItems();
        fetchStats();
      }
    } catch (error: any) {
      console.error('Failed to delete media:', error);
      toast.error('Failed to delete media', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDownload = (media: MediaItem) => {
    const mediaUrl = getMediaUrl(media);
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = media.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl text-gray-900 dark:text-white">Media Library</h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4" />
            Upload Media
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage media files for your messages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.storageUsed.toFixed(2)} MB</p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Images</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.images}</p>
            </div>
            <Image className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Videos</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.videos}</p>
            </div>
            <Video className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.documents}</p>
            </div>
            <File className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search media files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      {/* Bulk-action toolbar — appears when at least one card is selected */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 dark:text-blue-100">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAllVisible}
              className="text-blue-700 dark:text-blue-300 hover:underline"
            >
              Select all on page
            </button>
            <button
              onClick={clearSelection}
              className="text-blue-700 dark:text-blue-300 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {bulkDownloading ? 'Zipping…' : 'Download zip'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
          </div>
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Loading media...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {searchQuery || typeFilter !== 'all' ? 'No media files match your filters' : 'No media files found'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery || typeFilter !== 'all' ? 'Try adjusting your search or filters' : 'Upload your first media file to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((media) => (
            <div
              key={media.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all"
            >
              {/* Preview */}
              <div
                className="relative aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden cursor-pointer group"
                onClick={() => {
                  setViewingMedia(media);
                  setShowViewModal(true);
                }}
                title="Click to view full size"
              >
                {renderPreview(media)}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Selection checkbox — visible on hover, persistent when checked.
                    Stops propagation so clicks don't open the view modal. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(media.id);
                  }}
                  aria-label={selectedIds.has(media.id) ? 'Deselect' : 'Select'}
                  className={`absolute top-2 left-2 z-10 p-1 rounded-md backdrop-blur-sm transition-opacity ${
                    selectedIds.has(media.id)
                      ? 'opacity-100 bg-blue-600 text-white'
                      : 'opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900'
                  }`}
                >
                  {selectedIds.has(media.id) ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-sm text-gray-900 dark:text-white mb-2 truncate" title={media.name}>
                  {media.name}
                </h3>
                
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="text-gray-900 dark:text-white">{formatFileSize(media.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-gray-900 dark:text-white capitalize">{media.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span className="text-gray-900 dark:text-white">{media.uploadedAt}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(media)}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-xs"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button
                    onClick={() => handleEdit(media)}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(media.id)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setCurrentPage}
        recordsPerPage={recordsPerPage}
      />

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-blue-900 dark:text-blue-100 mb-3">📌 Media Guidelines</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>• Maximum file size: 16 MB</li>
          <li>• Supported formats: JPG, PNG, PDF, MP4, Audio</li>
          <li>• Media files are cached for 30 days</li>
          <li>• Expired media must be re-uploaded</li>
          <li>• All media is encrypted and secure</li>
        </ul>
      </div>

      {/* Upload Modal — multi-file + drag-drop + per-file progress */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl text-gray-900 dark:text-white">Upload Media</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  // Drop completed/errored items so the next open starts fresh
                  setUploadQueue([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors block ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {dragActive ? 'Drop to upload' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, PDF, MP4, Audio up to 16MB — multiple files OK
                </p>
              </label>

              {/* Per-file progress list */}
              {uploadQueue.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-500">Upload queue</p>
                    {!uploading && (
                      <button
                        onClick={() => setUploadQueue([])}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Clear list
                      </button>
                    )}
                  </div>
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1 mr-3" title={item.file.name}>
                          {item.file.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                      {item.status === 'error' ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>
                      ) : item.status === 'done' ? (
                        <p className="text-xs text-green-600 dark:text-green-400">Uploaded ✓</p>
                      ) : (
                        <>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.status === 'pending' ? 'Waiting…' : `${item.progress}%`}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadQueue([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {uploading ? 'Close (uploads continue)' : 'Done'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading…' : 'Select Files'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Media Modal */}
      {showViewModal && viewingMedia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowViewModal(false)}>
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowViewModal(false);
                setViewingMedia(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="w-full h-full flex items-center justify-center">
              {viewingMedia.type === 'image' && (
                <img
                  src={getMediaUrl(viewingMedia)}
                  alt={viewingMedia.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '';
                    target.alt = 'Failed to load image';
                  }}
                />
              )}
              
              {viewingMedia.type === 'video' && (
                <video
                  src={getMediaUrl(viewingMedia)}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                  onError={(e) => {
                    console.error('Failed to load video');
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              
              {viewingMedia.type === 'audio' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full">
                  <div className="text-center mb-6">
                    <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl text-gray-900 dark:text-white mb-2">{viewingMedia.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Audio File</p>
                  </div>
                  <audio
                    src={getMediaUrl(viewingMedia)}
                    controls
                    className="w-full"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}
              
              {(viewingMedia.type === 'document') && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-4xl w-full h-full flex flex-col">
                  <div className="text-center mb-6">
                    <FileText className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                    <h3 className="text-xl text-gray-900 dark:text-white mb-2">{viewingMedia.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Document File</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <iframe
                      src={getMediaUrl(viewingMedia)}
                      className="w-full h-full min-h-[500px] border-0"
                      title={viewingMedia.name}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <a
                      href={getMediaUrl(viewingMedia)}
                      download={viewingMedia.name}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            {/* Media Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 text-white text-sm">
              <p className="font-medium">{viewingMedia.name}</p>
              <p className="text-xs text-gray-300">
                {formatFileSize(viewingMedia.size)} • {viewingMedia.type.toUpperCase()} • Uploaded {viewingMedia.uploadedAt}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMedia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl text-gray-900 dark:text-white">Edit Media</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMedia(null);
                  setEditName('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Media Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter media name"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMedia(null);
                  setEditName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
