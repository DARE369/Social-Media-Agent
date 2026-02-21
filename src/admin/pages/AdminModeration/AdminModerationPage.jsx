import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../services/supabaseClient";
import ModerationQueue from "../../components/ContentModeration/ModerationQueue";
import FilterBar from "../../components/ContentModeration/FilterBar";
import PublicationModal from "../../components/ContentModeration/PublicationModal";
import EditModal from "../../components/ContentModeration/EditModal";
import { Loader, RefreshCw, AlertTriangle } from "lucide-react";
import "../../styles/AdminDashboard.css";

export default function AdminModerationPage() {
  const [allContent, setAllContent] = useState([]);
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [filters, setFilters] = useState({
    search: "", user: "all", type: "all", status: "all", dateRange: "all"
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [modals, setModals] = useState({ pub: false, edit: false });

  // --- 1. Safe Data Fetching (No failing Joins) ---
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // A. Fetch Drafts (Generations)
      const { data: drafts, error: err1 } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (err1) throw err1;

      // B. Fetch Posts
      const { data: posts, error: err2 } = await supabase
        .from("posts")
        .select("*") // We'll fetch linked generations manually if needed, or just rely on flat data
        .order("scheduled_at", { ascending: false });

      if (err2) throw err2;

      // C. Fetch Profiles Manually
      const userIds = new Set([
        ...drafts.map(d => d.user_id), 
        ...posts.map(p => p.user_id)
      ]);
      
      let userMap = {};
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));
        
        users?.forEach(u => { userMap[u.id] = u; });
      }

      // D. Fetch Linked Generations for Posts (to get media URL)
      const genIds = new Set(posts.map(p => p.generation_id).filter(Boolean));
      let genMap = {};
      if (genIds.size > 0) {
        const { data: linkedGens } = await supabase
          .from("generations")
          .select("id, storage_path, media_type")
          .in("id", Array.from(genIds));
        
        linkedGens?.forEach(g => { genMap[g.id] = g; });
      }

      // E. Normalize Data
      const normalizedDrafts = drafts.map(d => ({
        ...d,
        data_type: 'draft',
        unified_date: d.created_at,
        unified_status: 'draft',
        media_url: d.storage_path,
        profiles: userMap[d.user_id] || { full_name: 'Unknown', email: '' }
      }));

      const normalizedPosts = posts.map(p => ({
        ...p,
        data_type: 'post',
        unified_date: p.scheduled_at,
        unified_status: p.status,
        media_url: genMap[p.generation_id]?.storage_path,
        media_type: genMap[p.generation_id]?.media_type,
        profiles: userMap[p.user_id] || { full_name: 'Unknown', email: '' }
      }));

      // Combine & Remove duplicates (if a draft became a post)
      const postedGenIds = new Set(normalizedPosts.map(p => p.generation_id));
      const visibleDrafts = normalizedDrafts.filter(d => !postedGenIds.has(d.id));

      const masterList = [...normalizedPosts, ...visibleDrafts];
      setAllContent(masterList);

      // Extract users for filter dropdown
      const uList = Object.values(userMap).filter(u => u.full_name);
      setUniqueUsers(uList);

    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Real-time subscriptions
    const sub1 = supabase.channel('admin-mod-gen').on('postgres_changes', { event: '*', schema: 'public', table: 'generations' }, fetchData).subscribe();
    const sub2 = supabase.channel('admin-mod-post').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchData).subscribe();
    return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); };
  }, []);

  // --- 2. Filter Logic ---
  const filteredContent = useMemo(() => {
    return allContent.filter(item => {
      // Search
      const searchMatch = !filters.search || 
        (item.caption && item.caption.toLowerCase().includes(filters.search.toLowerCase())) ||
        (item.prompt && item.prompt.toLowerCase().includes(filters.search.toLowerCase())) ||
        (item.profiles.full_name && item.profiles.full_name.toLowerCase().includes(filters.search.toLowerCase()));

      // Status
      const statusMatch = filters.status === 'all' || item.unified_status === filters.status;
      // User
      const userMatch = filters.user === 'all' || item.user_id === filters.user;
      // Type
      const typeMatch = filters.type === 'all' || item.media_type === filters.type;

      return searchMatch && statusMatch && userMatch && typeMatch;
    });
  }, [allContent, filters]);

  // --- 3. Grouping ---
  const groupedContent = useMemo(() => {
    const groups = {};
    filteredContent.forEach(item => {
      const dateKey = new Date(item.unified_date).toLocaleDateString("en-US", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredContent]);

  // --- 4. Actions ---
  const handleAction = async (action, item) => {
    setSelectedItem(item);
    if (action === 'schedule' || action === 'reschedule') {
      setModals({ ...modals, pub: true });
    } else if (action === 'edit') {
      setModals({ ...modals, edit: true });
    } else if (action === 'delete') {
      if(!window.confirm("Delete this content?")) return;
      const table = item.data_type === 'draft' ? 'generations' : 'posts';
      await supabase.from(table).delete().eq('id', item.id);
      fetchData();
    }
  };

  const confirmPublication = async (finalData) => {
    // Insert or Update Post
    const payload = {
      user_id: finalData.user_id,
      generation_id: finalData.id, // Link to draft
      caption: finalData.caption,
      scheduled_at: finalData.scheduled_at,
      status: finalData.status
    };

    let error;
    if (finalData.data_type === 'post') {
        // Update existing post
        const { error: err } = await supabase.from("posts").update(payload).eq('id', finalData.id);
        error = err;
    } else {
        // Create new post from draft
        const { error: err } = await supabase.from("posts").insert(payload);
        error = err;
    }

    if (error) alert("Error: " + error.message);
    else {
      setModals({ ...modals, pub: false });
      fetchData();
    }
  };

  const confirmEdit = async (editedData) => {
    const table = editedData.data_type === 'draft' ? 'generations' : 'posts';
    const payload = table === 'generations' 
      ? { metadata: { caption: editedData.caption, hashtags: editedData.hashtags } }
      : { caption: editedData.caption };

    const { error } = await supabase.from(table).update(payload).eq('id', editedData.id);
    if (error) alert("Error: " + error.message);
    else {
      setModals({ ...modals, edit: false });
      fetchData();
    }
  };

  return (
    <div className="admin-moderation fade-in">
      <header className="moderation-page-header">
        <div>
          <h1>Content Moderation</h1>
          <p>Master view of all content lifecycle.</p>
        </div>
        <button onClick={fetchData} className="btn-icon"><RefreshCw size={18}/></button>
      </header>

      {errorMsg && <div className="error-banner"><AlertTriangle size={16}/> {errorMsg}</div>}

      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        uniqueUsers={uniqueUsers} 
      />

      <div className="moderation-content-area">
        {loading ? (
          <div className="loader-container"><Loader className="animate-spin"/> Loading...</div>
        ) : (
          <ModerationQueue 
            groupedPosts={groupedContent}
            onAction={handleAction}
          />
        )}
      </div>

      {modals.pub && selectedItem && (
        <PublicationModal 
          item={selectedItem}
          onClose={() => setModals({ ...modals, pub: false })}
          onConfirm={confirmPublication}
        />
      )}

      {modals.edit && selectedItem && (
        <EditModal 
          post={selectedItem}
          onClose={() => setModals({ ...modals, edit: false })}
          onSave={confirmEdit}
        />
      )}
    </div>
  );
}