import React, { useState, useEffect } from "react";
import { ArrowLeft, Mail, Calendar, Shield, AlertTriangle, Link as LinkIcon, Activity } from "lucide-react";
import SocialMediaTile from "./SocialMediaTile";
import ContentAnalytics from "../ContentAnalytics/ContentAnalytics";
import ContentManager from "../ContentManager/ContentManager";
import { supabase } from "../../../services/supabaseClient";
import "../../styles/AdminDashboard.css";

export default function UserDetailsPanel({ user, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    if (user?.id) {
      fetchConnectedAccounts(user.id);
    }
  }, [user]);


// REPLACE the existing handleSuspend, handleResetPassword, and handleDelete functions with these:

  // --- Action: Suspend User ---
  const handleSuspend = async () => {
    if (!user) return;
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'Suspend' : 'Activate';
    
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);
      
      if (error) throw error;
      alert(`User ${action}ed successfully.`);
      
      // Optional: If you passed a refresh function, call it here
      // onRefresh(); 
    } catch (err) {
      console.error("Suspend Error:", err);
      alert(`Failed to ${action} user: ` + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Action: Reset Password ---
  const handleResetPassword = async () => {
    if (!user || !user.email) return;
    
    if (!window.confirm(`Send password reset email to ${user.email}?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      
      if (error) throw error;
      alert(`Password reset email sent to ${user.email}`);
    } catch (err) {
      console.error("Reset Error:", err);
      alert("Error sending reset email: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Action: Delete User ---
  const handleDelete = async () => {
    const confirmText = prompt(`Type "DELETE" to permanently remove ${user.name}.`);
    if (confirmText !== "DELETE") return;

    setActionLoading(true);
    try {
      // 1. Delete from profiles (Public Schema)
      // Note: This requires RLS policies to allow deletes, or cascading deletes on the server.
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;
      
      alert("User profile deleted.");
      if (onClose) onClose(); // Close the panel
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Error deleting user: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };


  const fetchConnectedAccounts = async (userId) => {
    const { data } = await supabase
      .from("connected_accounts")
      .select("id, platform, account_name")
      .eq("user_id", userId);
    setConnectedAccounts(data || []);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center mb-6">
          <Shield className="text-gray-600" size={40} />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No User Selected</h3>
        <p className="text-gray-500 max-w-sm">Select a user from the list on the left to view their details, manage connections, and audit activity.</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Fixed Header */}
      <div className="details-header">
        <div className="flex items-center gap-6 w-full">
          {/* Mobile Back Button */}
          <button onClick={onClose} className="md:hidden text-gray-400 mr-2 hover:text-white" type="button" aria-label="Back to user list">
            <ArrowLeft size={24} />
          </button>

          <img 
             src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
             alt={user.name} 
             className="details-avatar-large"
             onError={(e) => e.target.style.display='none'}
          />
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm mb-3">
              <span className="flex items-center gap-1.5"><Mail size={15}/> {user.email}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span className="flex items-center gap-1.5"><Calendar size={15}/> Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <span className={`status-badge status-${user.status}`}>
              {user.status}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Content Area */}
      <div className="user-details-scroll-area custom-scrollbar">
        
       {/* Navigation Tabs */}
<div className="tabs-container">
  {["overview", "manager", "analytics"].map((tab) => (
    <button
      key={tab}
      className={`nav-tab ${activeTab === tab ? "active" : ""}`}
      onClick={() => setActiveTab(tab)}
      type="button"
    >
      {tab}
    </button>
  ))}
</div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Connected Accounts Card */}
            <div className="details-card">
              <h4><LinkIcon size={16}/> Connected Platforms</h4>
              <div className="social-grid">
                {connectedAccounts.length > 0 ? (
                  connectedAccounts.map(acc => (
                    <SocialMediaTile 
                      key={acc.id} 
                      platform={acc.platform} 
                      username={acc.account_name} 
                      status="connected" 
                    />
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center bg-[#151515] rounded-lg border border-dashed border-[#333]">
                    <p className="text-gray-500 text-sm">No social accounts connected yet.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Card (Placeholder for now) */}
            <div className="details-card">
               <h4><Activity size={16}/> Recent Activity</h4>
               <p className="text-gray-500 text-sm">No recent activity logged for this user.</p>
            </div>

            {/* Danger Zone Card */}
            <div className="details-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <h4 className="text-red-400"><AlertTriangle size={16}/> Danger Zone</h4>
              <p className="text-gray-500 text-sm mb-6">
                These actions are destructive or affect the user's ability to access the platform.
              </p>
{/* ... inside the Danger Zone <div className="details-card"> ... */}

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="btn-danger-zone btn-suspend"
                  type="button"
                >
                  {actionLoading ? "Processing..." : (user.status === 'suspended' ? "Unsuspend User" : "Suspend User")}
                </button>

                <button 
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                  className="btn-danger-zone btn-reset"
                  type="button"
                >
                  Send Password Reset
                </button>

                <button 
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn-danger-zone btn-delete"
                  type="button"
                >
                  Delete Account
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "manager" && <ContentManager user={user} />}
        {activeTab === "analytics" && <ContentAnalytics user={user} />}
        
      </div>
    </>
  );
}
