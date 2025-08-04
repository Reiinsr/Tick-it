import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import { ArrowLeft, User, Tag, Settings as SettingsIcon, ClipboardList, Users, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: <Tag className="h-4 w-4 mr-1" /> },
  { key: 'tickets', label: 'Tickets', icon: <ClipboardList className="h-4 w-4 mr-1" /> },
  { key: 'users', label: 'Users', icon: <Users className="h-4 w-4 mr-1" /> },
  { key: 'history', label: 'History', icon: <History className="h-4 w-4 mr-1" /> },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4 mr-1" /> },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hideAdminSignup, setHideAdminSignup] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const isSuperAdmin = userProfile?.role === 'admin';
  const isCategoryAdmin = ['it_admin', 'maintenance_admin', 'housekeeping_admin'].includes(userProfile?.role);
  const canManageRoles = isSuperAdmin; // Only regular admins can manage roles
  const canManageSettings = isSuperAdmin; // Only regular admins can manage settings
  const canAccessAdmin = isSuperAdmin || isCategoryAdmin; // Both can access admin panel

  // Redirect non-admin users
  if (!loading && !canAccessAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (user && userProfile) {
      fetchTickets();
      fetchProfiles(); // All admins need profiles for assignment
      fetchAdminSettings();
    }
  }, [user, userProfile]);

  const fetchProfiles = async () => {
    console.log('Fetching profiles...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      console.log('Profiles loaded:', data);
      setProfiles(data || []);
    }
  };

  const fetchTickets = async () => {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, full_name, email),
        assigned_to:assigned_to_id (id, full_name, email)
      `)
      .order('date_created', { ascending: false });

    // Filter tickets based on admin type
    if (userProfile?.role === 'it_admin') {
      query = query.eq('category', 'IT');
    } else if (userProfile?.role === 'maintenance_admin') {
      query = query.eq('category', 'Maintenance');
    } else if (userProfile?.role === 'housekeeping_admin') {
      query = query.eq('category', 'Housekeeping');
    }
    // Regular admins can see all tickets (no additional filter)

    const { data, error } = await query;
    if (!error) setTickets(data || []);
  };

  const fetchAdminSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('key', 'hide_admin_signup')
      .maybeSingle();
    if (!error && data) setHideAdminSignup(data.value === 'true');
  };

  const handleRoleChange = async (userId, newRole) => {
    console.log('Changing role for user:', userId, 'to:', newRole);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error changing role:', error);
      alert(`Failed to change role: ${error.message}`);
    } else {
      console.log('Role changed successfully:', data);
      alert(`Role changed to ${newRole} successfully!`);
      
      // If the user changed their own role, refresh their profile
      if (userId === user?.id) {
        console.log('User changed their own role, refreshing profile...');
        await refreshUserProfile();
      }
      
      // Refresh the profiles list
      fetchProfiles();
    }
  };

  const handleAssign = async (ticketId, assignedToId) => {
    await supabase.from('tickets').update({ assigned_to_id: assignedToId }).eq('id', ticketId);
    fetchTickets();
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    console.log('Changing status for ticket:', ticketId, 'to:', newStatus, 'by user:', userProfile?.role);
    
    const { data, error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)
      .select();

    if (error) {
      console.error('Error changing ticket status:', error);
      alert(`Failed to change ticket status: ${error.message}`);
    } else {
      console.log('Ticket status changed successfully:', data);
      alert(`Ticket status changed to ${newStatus} successfully!`);
      fetchTickets(); // Refresh the tickets list
    }
  };

  const handleHideAdminSignupToggle = async () => {
    setSavingSettings(true);
    const newValue = !hideAdminSignup;
    console.log('Upserting hide_admin_signup with value:', newValue ? 'true' : 'false');
    const { error } = await supabase.from('admin_settings').upsert({
      id: '1779b168-3ba7-48a0-a3bf-58f2cdd16259',
      key: 'hide_admin_signup',
      value: newValue ? 'true' : 'false'
    });
    if (error) {
      console.error('Upsert error:', error);
    } else {
      setHideAdminSignup(newValue);
    }
    setSavingSettings(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Ticket stats
  const ticketStats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'New').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    onHold: tickets.filter(t => t.status === 'On Hold').length,
    completed: tickets.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Tag className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isSuperAdmin ? 'Admin Settings' : `${userProfile?.role === 'it_admin' ? 'IT' : userProfile?.role === 'maintenance_admin' ? 'Maintenance' : 'Housekeeping'} Admin Dashboard`}
          </h1>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex gap-2 border-b pb-2">
          {TABS.filter(tab => {
            // Category admins can only see Dashboard, Tickets, and History
            if (isCategoryAdmin && !isSuperAdmin) {
              return ['dashboard', 'tickets', 'history'].includes(tab.key);
            }
            return true; // Super admins can see all tabs
          }).map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
        {activeTab === 'dashboard' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <ClipboardList className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Total Tickets</p>
                      <p className="text-2xl font-bold">{tickets.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{profiles.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <History className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">View History</p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-purple-600"
                        onClick={() => window.open('/history', '_blank')}
                      >
                        Open History Page
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
        {activeTab === 'tickets' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Tickets List</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded shadow text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b">Title</th>
                    <th className="px-4 py-2 border-b">Category</th>
                    <th className="px-4 py-2 border-b">Description</th>
                    <th className="px-4 py-2 border-b">Requester</th>
                    <th className="px-4 py-2 border-b">Status</th>
                    <th className="px-4 py-2 border-b">Assigned To</th>
                    <th className="px-4 py-2 border-b">Date Created</th>
                    <th className="px-4 py-2 border-b">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-4 py-2 border-b font-medium">{ticket.title}</td>
                      <td className="px-4 py-2 border-b">{ticket.category}</td>
                      <td className="px-4 py-2 border-b max-w-xs truncate" title={ticket.description}>{ticket.description}</td>
                      <td className="px-4 py-2 border-b">{ticket.requester?.full_name || 'Unknown'}</td>
                      <td className="px-4 py-2 border-b">
                        {(isSuperAdmin || isCategoryAdmin) ? (
                          <select
                            className="border rounded px-2 py-1"
                            value={ticket.status}
                            onChange={e => handleStatusChange(ticket.id, e.target.value)}
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          ticket.status
                        )}
                      </td>
                      <td className="px-4 py-2 border-b">
                        {(isSuperAdmin || isCategoryAdmin) ? (
                          <select
                            className="border rounded px-2 py-1"
                            value={ticket.assigned_to_id || ''}
                            onChange={e => handleAssign(ticket.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {profiles.map(profile => (
                              <option key={profile.id} value={profile.id}>
                                {profile.full_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          ticket.assigned_to?.full_name || 'Unassigned'
                        )}
                      </td>
                      <td className="px-4 py-2 border-b">{ticket.date_created ? new Date(ticket.date_created).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-2 border-b">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'users' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b">Name</th>
                    <th className="px-4 py-2 border-b">Email</th>
                    <th className="px-4 py-2 border-b">Role</th>
                    <th className="px-4 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-4 py-2 border-b flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {profile.full_name || 'No Name'}
                      </td>
                      <td className="px-4 py-2 border-b">{profile.email}</td>
                      <td className="px-4 py-2 border-b">
                        <Badge variant={profile.role === 'admin' ? 'secondary' : 'outline'}>{profile.role}</Badge>
                      </td>
                      <td className="px-4 py-2 border-b">
                        {canManageRoles && profile.role === 'user' ? (
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'admin')}>
                              Admin
                            </Button>
                            <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'it_admin')}>
                              IT Admin
                            </Button>
                            <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'maintenance_admin')}>
                              Maintenance Admin
                            </Button>
                            <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'housekeeping_admin')}>
                              Housekeeping Admin
                            </Button>
                          </div>
                        ) : canManageRoles && profile.role !== 'user' ? (
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleRoleChange(profile.user_id, 'user')}>
                              Make User
                            </Button>
                            {profile.role !== 'admin' && (
                              <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'admin')}>
                                Admin
                              </Button>
                            )}
                            {profile.role !== 'it_admin' && (
                              <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'it_admin')}>
                                IT Admin
                              </Button>
                            )}
                            {profile.role !== 'maintenance_admin' && (
                              <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'maintenance_admin')}>
                                Maintenance Admin
                              </Button>
                            )}
                            {profile.role !== 'housekeeping_admin' && (
                              <Button size="sm" onClick={() => handleRoleChange(profile.user_id, 'housekeeping_admin')}>
                                Housekeeping Admin
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">{profile.role}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'history' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Ticket History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded shadow text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b">Ticket ID</th>
                    <th className="px-4 py-2 border-b">Title</th>
                    <th className="px-4 py-2 border-b">Status</th>
                    <th className="px-4 py-2 border-b">Assigned To</th>
                    <th className="px-4 py-2 border-b">Date Modified</th>
                    <th className="px-4 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-4 py-2 border-b font-medium">{ticket.id}</td>
                      <td className="px-4 py-2 border-b">{ticket.title}</td>
                      <td className="px-4 py-2 border-b">{ticket.status}</td>
                      <td className="px-4 py-2 border-b">{ticket.assigned_to?.full_name || 'Unassigned'}</td>
                      <td className="px-4 py-2 border-b">{ticket.date_modified ? new Date(ticket.date_modified).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-2 border-b">
                        {/* Future: Add more actions here */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'settings' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>
            <div className="flex items-center gap-4">
              <span>Show Admin Sign Up Button:</span>
              {canManageSettings && (
                <Button
                  variant={hideAdminSignup ? 'outline' : 'default'}
                  onClick={handleHideAdminSignupToggle}
                  disabled={savingSettings}
                >
                  {hideAdminSignup ? 'Hide' : 'Show'}
                </Button>
              )}
              {!canManageSettings && (
                <span className="text-gray-400 text-sm">You do not have permission to manage this setting.</span>
              )}
              {savingSettings && <span className="text-xs text-gray-500 ml-2">Saving...</span>}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Admin; 