import React from "react";
import { Calendar, Clock, Trash2, Edit, Send, AlertCircle } from "lucide-react";
import "../../styles/AdminDashboard.css"; // Ensure CSS is imported

export default function ModerationQueue({ groupedPosts = {}, onAction }) {
  
  if (!groupedPosts || Object.keys(groupedPosts).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm italic">
        <p>No content found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedPosts).map(([date, posts]) => (
        <div key={date} className="queue-date-group animate-in fade-in">
          {/* Date Header */}
          <h3 className="queue-date-label">
            <Calendar size={12} className="text-indigo-500" /> {date}
          </h3>
          
          {/* Table */}
          <div className="queue-table-container">
            <table className="queue-table">
              <thead>
                <tr>
                  <th className="pl-6 w-24">Media</th>
                  <th className="w-48">User</th>
                  <th>Caption / Details</th>
                  <th className="w-32">Status</th>
                  <th className="text-right pr-6 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  // 1. Use the NORMALIZED fields from AdminModerationPage
                  // Fallback to storage_path if media_url is missing
                  const mediaUrl = post.media_url || post.storage_path;
                  
                  // Check if video based on normalized type OR file extension
                  const isVideo = post.media_type === 'video' || (mediaUrl && mediaUrl.match(/\.(mp4|mov|webm)$/i));
                  
                  // Caption fallback
                  const displayCaption = post.caption || post.prompt || "No caption";

                  return (
                    <tr key={post.id}>
                      {/* Media Preview */}
                      <td className="pl-6 py-4">
                        <div className="table-media-preview">
                          {mediaUrl ? (
                            isVideo ? (
                              <video src={mediaUrl} muted className="w-full h-full object-cover" />
                            ) : (
                              <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="flex items-center justify-center h-full bg-[#222] text-gray-600">
                              <AlertCircle size={16} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-4">
                        <div className="font-medium text-white text-sm">
                          {post.profiles?.full_name || "Unknown User"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {post.profiles?.email}
                        </div>
                      </td>

                      {/* Content Details */}
                      <td className="py-4">
                        <div className="text-sm text-gray-300 line-clamp-2 mb-1" title={displayCaption}>
                          {displayCaption}
                        </div>
                        {post.unified_status === 'scheduled' && (
                          <div className="text-[10px] text-indigo-400 flex items-center gap-1 font-medium">
                            <Clock size={10} /> 
                            {new Date(post.unified_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4">
                        <span className={`status-badge status-${post.unified_status}`}>
                          {post.unified_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right pr-6">
                        <div className="row-actions">
                          {/* Schedule Button (Only for Drafts) */}
                          {post.unified_status === 'draft' && (
                            <button 
                              onClick={() => onAction('schedule', post)} 
                              className="btn-action-sm schedule" 
                              title="Schedule Post"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          
                          {/* Edit Button (Drafts & Scheduled) */}
                          {post.unified_status !== 'published' && (
                            <button 
                              onClick={() => onAction('edit', post)} 
                              className="btn-action-sm" 
                              title="Edit Content"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          
                          {/* Delete Button (Always) */}
                          <button 
                            onClick={() => onAction('delete', post)} 
                            className="btn-action-sm delete" 
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
