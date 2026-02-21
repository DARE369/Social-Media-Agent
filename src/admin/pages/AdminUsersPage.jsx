import React, { useState, useEffect } from "react";
import UserListPanel from "../components/UserListPanel/UserListPanel";
import UserDetailsPanel from "../components/UserDetailsPanel/UserDetailsPanel";
import { supabase } from "../../services/supabaseClient";
import "../styles/AdminDashboard.css";

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers((data || []).map(p => ({
        id: p.id,
        name: p.full_name || "Unnamed User",
        email: p.email || "No email",
        avatar: p.avatar_url,
        status: p.status || "active",
        role: p.role || "user",
        created_at: p.created_at
      })));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const channel = supabase
      .channel("admin-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="user-management-page">
      {/* Left Panel: Scrolls independently */}
      <div className={`user-list-wrapper ${selectedUser ? 'hidden-mobile' : ''}`}>
        <UserListPanel 
          users={users} 
          selectedUser={selectedUser} 
          onSelectUser={setSelectedUser} 
          loading={loading}
        />
      </div>

      {/* Right Panel: Fixed container, internal scroll */}
      <div className="user-details-wrapper">
        <UserDetailsPanel 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      </div>
    </div>
  );
}