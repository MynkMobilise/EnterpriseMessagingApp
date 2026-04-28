import { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, FileText, Video, Trash2, Download, X, Edit2, Search, Filter, HardDrive, File, Image, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Pagination } from '../shared/Pagination';

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (16MB)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Maximum file size is 16MB',
      });
      return;
    }

    setUploading(true);
    try {
      const response = await apiService.media.upload(file);
      if (response.success) {
        toast.success('Media uploaded successfully');
        setShowUploadModal(false);
        fetchMediaItems();
        fetchStats();
      }
    } catch (error: any) {
      console.error('Failed to upload media:', error);
      toast.error('Failed to upload media', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl text-gray-900 dark:text-white">Upload Media</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors block"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, PDF, MP4, Audio up to 16MB
                </p>
              </label>
              {uploading && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-blue-600">Uploading...</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Select File'}
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
